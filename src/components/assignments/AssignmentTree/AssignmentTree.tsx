'use client'

import { useEffect, useRef } from 'react'
import type {
  DepartmentNode, UnitNode, SectionNode, TriState, AssignmentTreeState,
} from './useAssignmentTree'

interface Props {
  departments: DepartmentNode[]
  tree:        AssignmentTreeState
}

function TriCheckbox({
  state, onChange, disabled,
}: {
  state:    TriState
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'indeterminate'
  }, [state])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'checked'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 accent-green-700 disabled:opacity-40"
    />
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 shrink-0 transition-transform"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', color: '#9ca3af' }}
    >
      <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Row({
  depth, expandable, open, onToggleExpand, checkbox, label, count, disabled,
}: {
  depth:          number
  expandable:     boolean
  open?:          boolean
  onToggleExpand?: () => void
  checkbox:       React.ReactNode
  label:          string
  count?:         number
  disabled?:      boolean
}) {
  return (
    <div
      className="flex items-center gap-2 py-2 pr-3 cursor-pointer transition-colors"
      style={{ paddingLeft: `${12 + depth * 20}px`, borderBottom: '1px solid #f3f4f6', opacity: disabled ? 0.55 : 1 }}
      onClick={expandable && !disabled ? onToggleExpand : undefined}
    >
      {expandable ? <Chevron open={!!open} /> : <span className="w-3.5 shrink-0" />}
      {checkbox}
      <span className="text-sm text-gray-800 flex-1">{label}</span>
      {typeof count === 'number' && (
        <span className="text-xs text-gray-400">{count} {count === 1 ? 'person' : 'people'}</span>
      )}
    </div>
  )
}

function PersonRow({ id, name, employeeId, designation, depth, checked, onToggle }: {
  id: string; name: string; employeeId: string; designation: string
  depth: number; checked: boolean; onToggle: (checked: boolean) => void
}) {
  return (
    <label
      key={id}
      className="flex items-center gap-2 py-1.5 pr-3 cursor-pointer"
      style={{ paddingLeft: `${12 + depth * 20}px` }}
    >
      <span className="w-3.5 shrink-0" />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 accent-green-700"
      />
      <div className="flex-1">
        <div className="text-sm text-gray-800">{name}</div>
        <div className="text-xs text-gray-400">{employeeId} · {designation}</div>
      </div>
    </label>
  )
}

function SectionGroup({ section, unit, tree }: { section: SectionNode; unit: UnitNode; tree: AssignmentTreeState }) {
  const open  = tree.expandedSections.has(section.id)
  const cache = tree.unitPersons[unit.id]
  const persons = cache?.status === 'loaded' ? (cache.sectioned[section.id] ?? []) : []

  return (
    <>
      <Row
        depth={2}
        expandable={section.personCount > 0}
        open={open}
        onToggleExpand={() => tree.toggleExpandSection(section.id, unit.id)}
        disabled={section.personCount === 0}
        checkbox={
          <TriCheckbox
            state={tree.sectionState(section, unit.id)}
            disabled={section.personCount === 0}
            onChange={(next) => tree.toggleSection(section, unit.id, next)}
          />
        }
        label={section.name}
        count={section.personCount}
      />
      {open && cache?.status === 'loading' && (
        <p className="text-xs text-gray-400" style={{ paddingLeft: `${12 + 3 * 20}px` }}>Loading…</p>
      )}
      {open && persons.map((p) => (
        <PersonRow
          key={p.id} id={p.id} name={p.name} employeeId={p.employeeId} designation={p.designation}
          depth={3} checked={tree.isPersonChecked(p, unit.id)}
          onToggle={(next) => tree.togglePerson(p.id, next)}
        />
      ))}
    </>
  )
}

function UnassignedGroup({ unit, tree }: { unit: UnitNode; tree: AssignmentTreeState }) {
  const sectionId = `${unit.id}:unassigned`
  const open  = tree.expandedSections.has(sectionId)
  const cache = tree.unitPersons[unit.id]
  const persons = cache?.status === 'loaded' ? cache.unsectioned : []
  const count = unit.personCount - unit.sections.reduce((sum, s) => sum + s.personCount, 0)

  return (
    <>
      <Row
        depth={2}
        expandable={count > 0}
        open={open}
        onToggleExpand={() => tree.toggleExpandSection(sectionId, unit.id)}
        checkbox={
          <TriCheckbox
            state={tree.unassignedState(unit.id)}
            onChange={(next) => tree.toggleUnassigned(unit.id, next)}
          />
        }
        label="Unassigned to a section"
        count={count}
      />
      {open && cache?.status === 'loading' && (
        <p className="text-xs text-gray-400" style={{ paddingLeft: `${12 + 3 * 20}px` }}>Loading…</p>
      )}
      {open && persons.map((p) => (
        <PersonRow
          key={p.id} id={p.id} name={p.name} employeeId={p.employeeId} designation={p.designation}
          depth={3} checked={tree.isPersonChecked(p, unit.id)}
          onToggle={(next) => tree.togglePerson(p.id, next)}
        />
      ))}
    </>
  )
}

function UnitGroup({ unit, tree }: { unit: UnitNode; tree: AssignmentTreeState }) {
  const open = tree.expandedUnits.has(unit.id)
  const showUnassigned = tree.unitHasUnassigned(unit)

  return (
    <>
      <Row
        depth={1}
        expandable={unit.personCount > 0}
        open={open}
        onToggleExpand={() => tree.toggleExpandUnit(unit.id)}
        disabled={unit.personCount === 0}
        checkbox={
          <TriCheckbox
            state={tree.unitState(unit)}
            disabled={unit.personCount === 0}
            onChange={(next) => tree.toggleUnit(unit, next)}
          />
        }
        label={unit.name}
        count={unit.personCount}
      />
      {open && unit.sections.map((section) => (
        <SectionGroup key={section.id} section={section} unit={unit} tree={tree} />
      ))}
      {open && showUnassigned && <UnassignedGroup unit={unit} tree={tree} />}
    </>
  )
}

export function AssignmentTree({ departments, tree }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
      {departments.map((dept) => {
        const open = tree.expandedDepts.has(dept.id)
        return (
          <div key={dept.id}>
            <Row
              depth={0}
              expandable={dept.units.length > 0}
              open={open}
              onToggleExpand={() => tree.toggleExpandDept(dept.id)}
              disabled={dept.personCount === 0}
              checkbox={
                <TriCheckbox
                  state={tree.deptState(dept)}
                  disabled={dept.personCount === 0}
                  onChange={(next) => tree.toggleDept(dept, next)}
                />
              }
              label={dept.name}
              count={dept.personCount}
            />
            {open && dept.units.map((unit) => (
              <UnitGroup key={unit.id} unit={unit} tree={tree} />
            ))}
          </div>
        )
      })}
      {departments.length === 0 && (
        <p className="text-sm text-gray-400 px-4 py-3">No departments found.</p>
      )}
    </div>
  )
}
