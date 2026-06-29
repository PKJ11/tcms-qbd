export type ContentStatus = 'DRAFT' | 'APPROVED' | 'RETIRED'
export type VersionType   = 'MAJOR' | 'MINOR'
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
    versionType:  VersionType
    status:       ContentStatus
    effectiveDate: Date
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
  versionType:   VersionType
  fileUrl:       string
  fileName:      string
  fileType:      FileType
  changeSummary: string
  effectiveDate: Date
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
  effectiveDate: string
  versionType:   VersionType
  fileType:      FileType
}

export interface ApproveMaterialInput {
  justification: string
}