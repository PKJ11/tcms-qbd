export {
  getAllTechniques,
  getTechniqueById,
  createTechnique,
  getQualifications,
  getQualificationById,
  createQualification,
  signQualification,
  rejectQualification,
  uploadScannedDocument,
  getScannedDocumentUrl,
  getCertificateUrl,
  getCompetencyMatrix,
  getUpcomingExpiries,
  getPersonsAndTechniques,
} from './actions'

export type {
  TechniqueItem,
  QualificationListItem,
  SignatoryEntry,
  CreateTechniqueInput,
  CreateQualificationInput,
  QualStatus,
  QualOutcome,
  TechniqueType,
  SignatoryRole,
  SignatoryStatus,
} from './types'