export type QualStatus  = 'INITIATED' | 'IN_PROGRESS' | 'APPROVED' | 'EXPIRED' | 'REVOKED'
export type QualOutcome = 'COMPETENT' | 'NOT_YET_COMPETENT'
export type TechniqueType = 'METHOD' | 'INSTRUMENT' | 'TECHNIQUE'
export type SignatoryRole   = 'QC_TRAINER' | 'QA_TRAINER'
export type SignatoryStatus = 'PENDING' | 'SIGNED' | 'REJECTED'

export interface TechniqueItem {
  id:        string
  name:      string
  code:      string
  type:      TechniqueType
  isActive:  boolean
  department: {
    id:   string
    name: string

  }
  _count: {
    qualifications: number
  }
}

export interface QualificationListItem {
  id:            string
  status:        QualStatus
  outcome:       QualOutcome | null
  performedOn:   Date | null
  initiatedAt:   Date
  approvedAt:    Date | null
  expiryDate:    Date | null
  createdAt:     Date
  person: {
    id:         string
    name:       string
    employeeId: string
    department: { id: string; name: string } | null
  }
  technique: {
    id:   string
    name: string
    code: string
    type: TechniqueType
  }
  supervisor: {
    id:   string
    name: string
  } | null
  initiatedBy: {
    id:   string
    name: string
  }
  signatories: SignatoryEntry[]
  certificate: {
    id:         string
    certNumber: string
    issuedAt:   Date
    fileUrl:    string
  } | null
  _count: {
    scannedDocuments: number
  }
}

export interface SignatoryEntry {
  id:            string
  stepOrder:     number
  requiredRole:  SignatoryRole
  status:        SignatoryStatus
  signedAt:      Date | null
  justification: string | null
  signedBy: {
    id:   string
    name: string
  } | null
}

export interface CreateTechniqueInput {
  name:         string
  code:         string
  type:         TechniqueType
  departmentId: string
}

export interface CreateQualificationInput {
  personId:     string
  techniqueId:  string
  performedOn:  string
  supervisorId: string
}