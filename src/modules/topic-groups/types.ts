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
  }
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

// departmentId/unitId are never taken from the client — they're always
// the creating trainer's own department+unit ("their team"). sectionId is
// optional and narrows the group to one section of that unit.
export interface CreateTopicGroupInput {
  name:      string
  sectionId?: string | null
  topicIds:  string[]
}

export interface UpdateTopicGroupTopicsInput {
  topicIds: string[]
}

// The trainer's own department/unit + that unit's sections — used to
// render the (fixed) scope on the group builder and the section picker.
export interface MyGroupingScope {
  department: { id: string; name: string; code: string }
  unit:       { id: string; name: string }
  sections:   { id: string; name: string; code: string }[]
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
