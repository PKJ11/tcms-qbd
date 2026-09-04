export interface TopicGroupItem {
  id:       string
  position: number
  topic: {
    id:   string
    name: string
  }
}

export interface TopicGroupListItem {
  id:         string
  name:       string
  isActive:   boolean
  createdAt:  Date
  department: {
    id:   string
    name: string
    code: string
  }
  unit: {
    id:   string
    name: string
  } | null
  section: {
    id:   string
    name: string
  } | null
  createdBy: {
    id:   string
    name: string
  }
  items: TopicGroupItem[]
}

// departmentId is never taken from the client — it's always the creating
// trainer's own department. unitId null = department-wide; unitId set =
// whole-unit; unitId + sectionId = one section of that unit.
export interface CreateTopicGroupInput {
  name:       string
  unitId?:    string | null
  sectionId?: string | null
  topicIds:   string[]
}

export interface UpdateTopicGroupTopicsInput {
  topicIds: string[]
}

// The trainer's own department, every unit in it, and each unit's sections
// — used to render the scope pickers on the group builder. myUnitId is the
// trainer's own unit, pre-selected as a sensible default.
export interface MyGroupingScope {
  department: { id: string; name: string; code: string }
  myUnitId:   string
  units: {
    id:       string
    name:     string
    sections: { id: string; name: string; code: string }[]
  }[]
}

// ── Team overview (trainer's reporting tree) ────────────────────────

export interface TeamMemberNode {
  id:           string
  name:         string
  employeeId:   string
  designation:  string
  roles:        string[]
  department:   { id: string; name: string; code: string }
  unit:         { id: string; name: string } | null
  joiningDate:  Date | null
  children:     TeamMemberNode[]
}

export interface DepartmentBreakdown {
  departmentId:   string
  departmentName: string
  count:          number
}

export interface TeamOverview {
  root:                TeamMemberNode | null
  totalTeamSize:       number
  departmentBreakdown: DepartmentBreakdown[]
}
