# Gestión de Issues

**Ubicación esperada:** `src/components/IssuesPanel.jsx`, `src/components/IssueBoard.jsx` (nuevos componentes)
**Contexto:** Panel para gestionar issues de los repositorios conectados con vista de tablero Kanban.

---

## 1. Tablero de Issues (Kanban)

Visualización tipo Kanban para organizar tareas.

**Componente IssueBoard:**
```jsx
// src/components/IssueBoard.jsx
export default function IssueBoard({ folderPath, providers }) {
  const [issues, setIssues] = useState([])
  const [columns, setColumns] = useState(['open', 'in-progress', 'review', 'done'])

  useEffect(() => {
    loadIssues()
  }, [])

  const loadIssues = async () => {
    const allIssues = []
    for (const provider of providers) {
      if (provider.status === 'connected') {
        const providerIssues = await window.electronAPI.getIssues(provider.id)
        allIssues.push(...providerIssues)
      }
    }
    setIssues(allIssues)
  }

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return

    const issue = issues.find(i => i.id === draggableId)
    const newStatus = columns[destination.droppableId]
    
    // Actualizar estado en el proveedor
    await window.electronAPI.updateIssueStatus(issue, newStatus)
    
    // Actualizar estado local
    setIssues(prev => prev.map(i =>
      i.id === draggableId ? { ...i, status: newStatus } : i
    ))
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {columns.map(columnId => (
          <Droppable key={columnId} droppableId={columnId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-shrink-0 w-80 rounded-lg p-3 transition ${
                  snapshot.isDraggingOver ? 'bg-slate-700/50' : 'bg-slate-800'
                }`}
              >
                <h2 className="text-sm font-semibold text-white mb-3 capitalize">
                  {columnId.replace('-', ' ')}
                </h2>
                <div className="space-y-2">
                  {issues
                    .filter(issue => issue.status === columnId)
                    .map((issue, index) => (
                      <Draggable key={issue.id} draggableId={issue.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-slate-700 p-3 rounded-lg cursor-move hover:bg-slate-600 transition ${
                              snapshot.isDragging ? 'shadow-lg shadow-slate-900' : ''
                            }`}
                          >
                            <h3 className="text-sm font-medium text-white">{issue.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{issue.description}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {issue.labels.map(label => (
                                <span
                                  key={label}
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: issue.labelColors[label] + '30', color: issue.labelColors[label] }}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                            {issue.assignee && (
                              <div className="mt-2 text-xs text-slate-400">
                                Asignado a: {issue.assignee}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}
```

---

## 2. Etiquetas (Labels)

Sistema para clasificar y filtrar issues.

**Componente LabelManager:**
```jsx
// src/components/LabelManager.jsx
function LabelManager({ issues, onFilterChange }) {
  const [labels, setLabels] = useState([])
  const [selectedLabels, setSelectedLabels] = useState([])

  useEffect(() => {
    // Extraer labels únicos de todos los issues
    const uniqueLabels = [...new Set(issues.flatMap(i => i.labels))]
    setLabels(uniqueLabels)
  }, [issues])

  const handleLabelToggle = (label) => {
    const updated = selectedLabels.includes(label)
      ? selectedLabels.filter(l => l !== label)
      : [...selectedLabels, label]
    
    setSelectedLabels(updated)
    onFilterChange(updated)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map(label => (
        <button
          key={label}
          onClick={() => handleLabelToggle(label)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            selectedLabels.includes(label)
              ? 'bg-brand-500 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

---

## 3. Asignaciones

Asignar issues a usuarios.

**Modal de Asignación:**
```jsx
function AssignIssueModal({ issue, contributors, onAssign, onClose }) {
  const [assignee, setAssignee] = useState(issue.assignee || '')

  const handleSubmit = async () => {
    await window.electronAPI.assignIssue(issue.id, assignee)
    onAssign(assignee)
    onClose()
  }

  return (
    <Modal title="Asignar Issue" onClose={onClose}>
      <select
        value={assignee}
        onChange={e => setAssignee(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
      >
        <option value="">Sin asignar</option>
        {contributors.map(contributor => (
          <option key={contributor.id} value={contributor.id}>
            {contributor.name}
          </option>
        ))}
      </select>
      <button onClick={handleSubmit} className="mt-4 w-full bg-brand-500 hover:bg-brand-600 rounded-lg py-2">
        Asignar
      </button>
    </Modal>
  )
}
```

---

## 4. Linking (Vinculación con Commits)

Asociar issues con commits y PRs.

```jsx
// En commit details, poder vincular a un issue
function LinkIssueToCommit({ commit, issues, onLink }) {
  const [selectedIssue, setSelectedIssue] = useState(null)

  const handleLink = async () => {
    await window.electronAPI.linkIssueToCommit(selectedIssue.id, commit.id)
    onLink(selectedIssue)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-400">Vincular a Issue:</label>
      <select
        value={selectedIssue?.id || ''}
        onChange={e => setSelectedIssue(issues.find(i => i.id === e.target.value))}
        className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
      >
        <option value="">Selecciona un issue</option>
        {issues.map(issue => (
          <option key={issue.id} value={issue.id}>
            #{issue.number} - {issue.title}
          </option>
        ))}
      </select>
      <button onClick={handleLink} className="w-full bg-brand-500 rounded py-2 text-sm font-medium">
        Vincular
      </button>
    </div>
  )
}
```

---

*Nota: Requiere integración con APIs de GitHub Issues, GitLab Issues, etc. La librería `react-beautiful-dnd` es excelente para drag-and-drop en el tablero.*
