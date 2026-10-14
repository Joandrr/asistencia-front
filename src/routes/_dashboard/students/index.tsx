/* eslint-disable react-refresh/only-export-components -- TanStack file routes export Route and their component from one module. */
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/students/')({
  component: StudentsPage,
})

const students = [
  { id: 'est-001', name: 'María Fernández', course: '1.º A', attendance: '96%', status: 'Regular' },
  { id: 'est-002', name: 'Carlos Rojas', course: '1.º A', attendance: '88%', status: 'Regular' },
  { id: 'est-003', name: 'Lucía Vargas', course: '2.º B', attendance: '72%', status: 'En riesgo' },
  { id: 'est-004', name: 'Diego Salvatierra', course: '3.º A', attendance: '100%', status: 'Regular' },
]

function StudentsPage() {
  return (
    <main className="dashboard-content">
      <section className="students-heading">
        <div>
          <p className="eyebrow">GESTIÓN ACADÉMICA</p>
          <h2>Estudiantes</h2>
          <p>Listado de estudiantes y su asistencia registrada.</p>
        </div>
        <span className="students-count">{students.length} estudiantes</span>
      </section>
      <div className="students-table-card">
        <table className="students-table">
          <caption className="sr-only">Listado de estudiantes</caption>
          <thead>
            <tr>
              <th scope="col">Registro</th>
              <th scope="col">Estudiante</th>
              <th scope="col">Curso</th>
              <th scope="col">Asistencia</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <Link
                    className="student-record-link"
                    to="/students/$studentId"
                    params={{ studentId: student.id }}
                  >
                    {student.id}
                  </Link>
                </td>
                <td>{student.name}</td>
                <td>{student.course}</td>
                <td>{student.attendance}</td>
                <td>
                  <span className={`student-status ${student.status === 'En riesgo' ? 'student-status-risk' : ''}`}>
                    {student.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
