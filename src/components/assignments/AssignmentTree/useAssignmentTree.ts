import { useMemo, useRef, useState } from 'react'

export interface SectionNode { id: string; name: string; code: string; personCount: number }
export interface UnitNode    { id: string; name: string; personCount: number; sections: SectionNode[] }
export interface DepartmentNode {
  id: string; name: string; code: string; personCount: number; units: UnitNode[]
}

export interface PersonLite {
  id:          string
  name:        string
  employeeId:  string
  designation: string
  sectionId:   string | null
}

export type TriState = 'checked' | 'unchecked' | 'indeterminate'

interface UnitPersonsCache {
  status:      'idle' | 'loading' | 'loaded' | 'error'
  sectioned:   Record<string, PersonLite[]>
  unsectioned: PersonLite[]
}

const EMPTY_CACHE: UnitPersonsCache = { status: 'idle', sectioned: {}, unsectioned: [] }

function unitAllPersons(cache: UnitPersonsCache): PersonLite[] {
  return [...Object.values(cache.sectioned).flat(), ...cache.unsectioned]
}

function combine(states: TriState[]): TriState {
  if (states.length === 0) return 'unchecked'
  const allChecked   = states.every((s) => s === 'checked')
  const allUnchecked = states.every((s) => s === 'unchecked')
  if (allChecked)   return 'checked'
  if (allUnchecked) return 'unchecked'
  return 'indeterminate'
}

// Cascading tri-state checkbox tree over Department -> Unit -> Section -> Person.
// Every node's effective checked state is either an explicit override at that
// node, or inherited from its nearest checked ancestor — so checking a
// Department/Unit pre-selects everything beneath it, and unchecking one
// person only affects that person. Person lists are fetched lazily, one
// request per Unit (shared by that unit's sections), only when the trainer
// expands into it or when resolving the final selection at submit time.
export function useAssignmentTree(departments: DepartmentNode[]) {
  const [deptChecked,    setDeptChecked]    = useState<Record<string, boolean>>({})
  const [unitChecked,    setUnitChecked]    = useState<Record<string, boolean>>({})
  const [sectionChecked, setSectionChecked] = useState<Record<string, boolean>>({})
  const [personChecked,  setPersonChecked]  = useState<Record<string, boolean>>({})

  const [expandedDepts,    setExpandedDepts]    = useState<Set<string>>(new Set())
  const [expandedUnits,    setExpandedUnits]    = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const [unitPersons, setUnitPersons] = useState<Record<string, UnitPersonsCache>>({})
  const [resolving,   setResolving]   = useState(false)

  // Authoritative cache read synchronously inside async resolution — state
  // updates from setUnitPersons don't land in time for a same-tick read.
  const cacheRef    = useRef<Partial<Record<string, UnitPersonsCache>>>({})
  const inFlightRef = useRef<Partial<Record<string, Promise<UnitPersonsCache>>>>({})

  const unitToDept = useMemo(() => {
    const map: Record<string, string> = {}
    for (const dept of departments) for (const unit of dept.units) map[unit.id] = dept.id
    return map
  }, [departments])

  const sectionToUnit = useMemo(() => {
    const map: Record<string, string> = {}
    for (const dept of departments) for (const unit of dept.units) for (const section of unit.sections) map[section.id] = unit.id
    return map
  }, [departments])

  function isDeptChecked(deptId: string): boolean {
    return deptChecked[deptId] ?? false
  }
  function isUnitChecked(unitId: string): boolean {
    if (unitId in unitChecked) return unitChecked[unitId]
    return isDeptChecked(unitToDept[unitId])
  }
  function isSectionChecked(sectionId: string): boolean {
    if (sectionId in sectionChecked) return sectionChecked[sectionId]
    return isUnitChecked(sectionToUnit[sectionId])
  }
  function isPersonChecked(person: PersonLite, unitId: string): boolean {
    if (person.id in personChecked) return personChecked[person.id]
    return person.sectionId ? isSectionChecked(person.sectionId) : isUnitChecked(unitId)
  }

  function omit(record: Record<string, boolean>, ids: string[]): Record<string, boolean> {
    if (ids.length === 0) return record
    const next = { ...record }
    for (const id of ids) delete next[id]
    return next
  }

  function toggleDept(dept: DepartmentNode, next: boolean) {
    setDeptChecked((prev) => ({ ...prev, [dept.id]: next }))
    const unitIds    = dept.units.map((u) => u.id)
    const sectionIds = dept.units.flatMap((u) => u.sections.map((s) => s.id))
    const personIds  = dept.units.flatMap((u) => unitAllPersons(cacheRef.current[u.id] ?? EMPTY_CACHE).map((p) => p.id))
    setUnitChecked((prev) => omit(prev, unitIds))
    setSectionChecked((prev) => omit(prev, sectionIds))
    setPersonChecked((prev) => omit(prev, personIds))
  }

  function toggleUnit(unit: UnitNode, next: boolean) {
    setUnitChecked((prev) => ({ ...prev, [unit.id]: next }))
    const sectionIds = unit.sections.map((s) => s.id)
    const personIds  = unitAllPersons(cacheRef.current[unit.id] ?? EMPTY_CACHE).map((p) => p.id)
    setSectionChecked((prev) => omit(prev, sectionIds))
    setPersonChecked((prev) => omit(prev, personIds))
  }

  function toggleSection(section: SectionNode, unitId: string, next: boolean) {
    setSectionChecked((prev) => ({ ...prev, [section.id]: next }))
    const cache = cacheRef.current[unitId] ?? EMPTY_CACHE
    const personIds = (cache.sectioned[section.id] ?? []).map((p) => p.id)
    setPersonChecked((prev) => omit(prev, personIds))
  }

  function toggleUnassigned(unitId: string, next: boolean) {
    const cache = cacheRef.current[unitId] ?? EMPTY_CACHE
    setPersonChecked((prev) => {
      const nextState = { ...prev }
      for (const p of cache.unsectioned) nextState[p.id] = next
      return nextState
    })
  }

  function togglePerson(personId: string, next: boolean) {
    setPersonChecked((prev) => ({ ...prev, [personId]: next }))
  }

  function ensureUnitPersonsLoaded(unitId: string): Promise<UnitPersonsCache> {
    const cached = cacheRef.current[unitId]
    if (cached?.status === 'loaded') return Promise.resolve(cached)
    if (inFlightRef.current[unitId]) return inFlightRef.current[unitId]

    const promise = (async (): Promise<UnitPersonsCache> => {
      setUnitPersons((prev) => ({ ...prev, [unitId]: { status: 'loading', sectioned: {}, unsectioned: [] } }))
      try {
        const res  = await fetch(`/api/personnel?unitId=${unitId}&isActive=true&scope=all`)
        const data = await res.json()
        const persons: PersonLite[] = (data.persons ?? []).map((p: {
          id: string; name: string; employeeId: string; designation: string
          section: { id: string; name: string } | null
        }) => ({
          id: p.id, name: p.name, employeeId: p.employeeId, designation: p.designation,
          sectionId: p.section?.id ?? null,
        }))

        const sectioned: Record<string, PersonLite[]> = {}
        const unsectioned: PersonLite[] = []
        for (const p of persons) {
          if (p.sectionId) (sectioned[p.sectionId] ??= []).push(p)
          else unsectioned.push(p)
        }

        const cache: UnitPersonsCache = { status: 'loaded', sectioned, unsectioned }
        cacheRef.current[unitId] = cache
        setUnitPersons((prev) => ({ ...prev, [unitId]: cache }))
        return cache
      } catch {
        const cache: UnitPersonsCache = { status: 'error', sectioned: {}, unsectioned: [] }
        cacheRef.current[unitId] = cache
        setUnitPersons((prev) => ({ ...prev, [unitId]: cache }))
        return cache
      } finally {
        delete inFlightRef.current[unitId]
      }
    })()

    inFlightRef.current[unitId] = promise
    return promise
  }

  function toggleExpandDept(deptId: string) {
    setExpandedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  function toggleExpandUnit(unitId: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
    ensureUnitPersonsLoaded(unitId)
  }

  function toggleExpandSection(sectionId: string, unitId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
    ensureUnitPersonsLoaded(unitId)
  }

  // Tri-state display for a Section — reflects real per-person overrides once
  // its unit's persons are loaded, otherwise falls back to the section's own
  // checked/inherited state (no person-level overrides can exist yet).
  function sectionState(section: SectionNode, unitId: string): TriState {
    const cache = cacheRef.current[unitId]
    if (cache?.status === 'loaded') {
      const persons = cache.sectioned[section.id] ?? []
      if (persons.length > 0) {
        return combine(persons.map((p) => (isPersonChecked(p, unitId) ? 'checked' : 'unchecked')))
      }
    }
    return isSectionChecked(section.id) ? 'checked' : 'unchecked'
  }

  function unassignedState(unitId: string): TriState {
    const cache = cacheRef.current[unitId]
    if (cache?.status === 'loaded' && cache.unsectioned.length > 0) {
      return combine(cache.unsectioned.map((p) => (isPersonChecked(p, unitId) ? 'checked' : 'unchecked')))
    }
    return isUnitChecked(unitId) ? 'checked' : 'unchecked'
  }

  function unitHasUnassigned(unit: UnitNode): boolean {
    const sectionTotal = unit.sections.reduce((sum, s) => sum + s.personCount, 0)
    return unit.personCount > sectionTotal
  }

  function unitState(unit: UnitNode): TriState {
    const cache = cacheRef.current[unit.id]
    if (cache?.status === 'loaded') {
      const persons = unitAllPersons(cache)
      if (persons.length > 0) {
        return combine(persons.map((p) => (isPersonChecked(p, unit.id) ? 'checked' : 'unchecked')))
      }
    }
    const childStates = unit.sections.map((s) => sectionState(s, unit.id))
    if (unitHasUnassigned(unit)) childStates.push(unassignedState(unit.id))
    if (childStates.length === 0) return isUnitChecked(unit.id) ? 'checked' : 'unchecked'
    return combine(childStates)
  }

  function deptState(dept: DepartmentNode): TriState {
    if (dept.units.length === 0) return isDeptChecked(dept.id) ? 'checked' : 'unchecked'
    return combine(dept.units.map(unitState))
  }

  // At submit time, resolve every checked leaf into a flat personIds list.
  // Already-loaded units resolve instantly from cache; a positively-selected
  // unit that was never expanded is fetched here (bounded, one call per such
  // unit, in parallel) — untouched/unselected units are never fetched.
  async function resolveSelectedPersonIds(): Promise<string[]> {
    setResolving(true)
    try {
      const ids = new Set<string>()
      const tasks: Promise<void>[] = []

      for (const dept of departments) {
        for (const unit of dept.units) {
          const alreadyLoaded = cacheRef.current[unit.id]?.status === 'loaded'
          const mightContribute =
            alreadyLoaded ||
            isUnitChecked(unit.id) ||
            unit.sections.some((s) => isSectionChecked(s.id))

          if (!mightContribute) continue

          tasks.push(
            ensureUnitPersonsLoaded(unit.id).then((cache) => {
              if (cache.status !== 'loaded') return
              for (const p of unitAllPersons(cache)) {
                if (isPersonChecked(p, unit.id)) ids.add(p.id)
              }
            })
          )
        }
      }

      await Promise.all(tasks)
      return [...ids]
    } finally {
      setResolving(false)
    }
  }

  return {
    expandedDepts, expandedUnits, expandedSections,
    unitPersons, resolving,
    deptState, unitState, sectionState, unassignedState, unitHasUnassigned,
    isPersonChecked,
    toggleDept, toggleUnit, toggleSection, toggleUnassigned, togglePerson,
    toggleExpandDept, toggleExpandUnit, toggleExpandSection,
    resolveSelectedPersonIds,
  }
}

export type AssignmentTreeState = ReturnType<typeof useAssignmentTree>
