export type ContentStatus = 'DRAFT' | 'APPROVED' | 'RETIRED'
export type FileType      = 'PPT' | 'PDF' | 'VIDEO' | 'OTHER'

export interface MaterialListItem {
  id:             string
  title:          string
  currentVersion: number
  status:         ContentStatus
  createdAt:      Date
  updatedAt:      Date
  topic: {
    id:   string
    name: string
  }
  versions: {
    id:           string
    versionLabel: string
    status:       ContentStatus
    uploadedBy: {
      id:   string
      name: string
    }
    approvedBy: {
      id:   string
      name: string
    } | null
  }[]
}

export interface MaterialVersion {
  id:            string
  materialId:    string
  versionNo:     number
  versionLabel:  string
  fileUrl:       string
  fileName:      string
  fileType:      FileType
  changeSummary: string
  status:        ContentStatus
  uploadedById:  string
  approvedById:  string | null
  approvedAt:    Date | null
  createdAt:     Date
  uploadedBy: {
    id:   string
    name: string
  }
  approvedBy: {
    id:   string
    name: string
  } | null
}

export interface CreateMaterialInput {
  title:         string
  topicId:       string
  changeSummary: string
  fileType:      FileType
}

export interface ApproveMaterialInput {
  justification: string
}