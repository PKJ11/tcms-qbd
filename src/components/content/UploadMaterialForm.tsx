'use client'

import { useState, useRef } from 'react'
import { useRouter }        from 'next/navigation'
import { JustificationModal } from '@/components/JustificationModal'

interface Topic { id: string; name: string }
interface Props  { topics: Topic[] }

const FILE_TYPES = [
  { value: 'PPT',   label: 'PowerPoint (PPT/PPTX)', accept: '.ppt,.pptx'           },
  { value: 'PDF',   label: 'PDF Document',           accept: '.pdf'                 },
  { value: 'VIDEO', label: 'Video',                  accept: '.mp4,.mov,.avi,.webm' },
  { value: 'OTHER', label: 'Other',                  accept: '.doc,.docx,.xls,.xlsx'},
]

const VERSION_TYPES = [
  {
    value:       'MINOR',
    label:       'Acknowledge everyone',
    description: 'Everyone who already completed this training is notified the document changed — no retest required',
  },
  {
    value:       'MAJOR',
    label:       'Assign the test',
    description: 'Everyone who already completed this training gets a new assignment and must redo it',
  },
]

export function UploadMaterialForm({ topics }: Props) {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title:         '',
    topicId:       '',
    changeSummary: '',
    effectiveDate: '',
    versionType:   'MINOR',
    fileType:      'PPT',
  })

  const [file,       setFile]       = useState<File | null>(null)
  const [dragOver,   setDragOver]   = useState(false)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [progress,   setProgress]   = useState(0)

  const selectedFileType = FILE_TYPES.find((f) => f.value === form.fileType)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.title || !form.topicId || !form.changeSummary ||
        !form.effectiveDate || !file) {
      setError('Please fill in all fields and select a file.')
      return
    }

    setModalOpen(true)
  }

  async function handleConfirm(justification: string) {
    setModalOpen(false)
    setLoading(true)
    setError(null)
    setProgress(10)

    const formData = new FormData()
    formData.append('file',          file!)
    formData.append('title',         form.title)
    formData.append('topicId',       form.topicId)
    formData.append('changeSummary', form.changeSummary)
    formData.append('effectiveDate', form.effectiveDate)
    formData.append('versionType',   form.versionType)
    formData.append('fileType',      form.fileType)
    formData.append('justification', justification)

    setProgress(40)

    const res = await fetch('/api/content', {
      method: 'POST',
      body:   formData,
    })

    setProgress(90)
    const data = await res.json()
    setProgress(100)
    setLoading(false)

    if (!res.ok) {
      setError(data.message ?? 'Upload failed.')
      setProgress(0)
      return
    }

    router.push('/content')
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
  const inputStyle = { borderColor: '#d1d5db', background: '#fff' }

  return (
    <>
      <div
        className="bg-white rounded-2xl border p-6"
        style={{ borderColor: '#e5e7eb' }}
      >
        <form onSubmit={handleSubmitClick} className="flex flex-col gap-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Material title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. HPLC Operation — Module 1"
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Training topic <span className="text-red-500">*</span>
            </label>
            <select
              name="topicId"
              value={form.topicId}
              onChange={handleChange}
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="">Select topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* File type + Version type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                File type <span className="text-red-500">*</span>
              </label>
              <select
                name="fileType"
                value={form.fileType}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              >
                {FILE_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Effective date <span className="text-red-500">*</span>
              </label>
              <input
                name="effectiveDate"
                type="date"
                value={form.effectiveDate}
                onChange={handleChange}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
                onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Version type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What should happen for previously trained staff? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {VERSION_TYPES.map((vt) => {
                const selected = form.versionType === vt.value
                return (
                  <button
                    key={vt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, versionType: vt.value }))}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: selected ? '#2d6a4f' : '#e5e7eb',
                      background:  selected ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {vt.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {vt.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Change summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Change summary <span className="text-red-500">*</span>
            </label>
            <textarea
              name="changeSummary"
              value={form.changeSummary}
              onChange={handleChange}
              placeholder="Describe what changed in this version..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all resize-none"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2d6a4f'}
              onBlur={(e)  => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              File <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">
                (max 100MB, {selectedFileType?.accept})
              </span>
            </label>

            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? '#2d6a4f' : '#e5e7eb',
                background:  dragOver ? '#f0fdf4' : '#fafafa',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true)  }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto mb-3"
                    width="32" height="32"
                    viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-sm text-gray-500">
                    Drag and drop or{' '}
                    <span style={{ color: '#2d6a4f' }} className="font-medium">
                      browse
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedFileType?.accept}
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={selectedFileType?.accept}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Progress bar */}
          {loading && progress > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Uploading to MinIO...</span>
                <span>{progress}%</span>
              </div>
              <div
                className="w-full rounded-full h-1.5"
                style={{ background: '#e5e7eb' }}
              >
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: '#2d6a4f' }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{
                background:  '#fef2f2',
                borderColor: '#fecaca',
                color:       '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/content"
              className="px-4 py-2 rounded-lg text-sm border font-medium"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
              style={{ background: loading ? '#4a9e6f' : '#2d6a4f' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload material
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <JustificationModal
        isOpen={modalOpen}
        title="Confirm upload"
        description={`Uploading "${form.title}". Once approved, ${form.versionType === 'MAJOR' ? 'everyone who already completed this training will be assigned it again.' : 'everyone who already completed this training will just be notified the document changed.'}`}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        loading={loading}
      />
    </>
  )
}