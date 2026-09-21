export type Employee = {
  id: number
  name: string
  email: string
  phone: string
  sector: string
  position: string
  status: boolean
  salary: number
}

const page1: Omit<Employee, 'id'>[] = [
  { name: 'Daniela Alves', email: 'daniela.alves@gmail.com', phone: '(19) 99988-7766', sector: 'Recursos Humanos', position: 'Gerente de RH', status: true, salary: 14900.00 },
  { name: 'Júlia Lima', email: 'julia.lima@gmail.com', phone: '(19) 98765-4321', sector: 'Pátio', position: 'Vendedor', status: true, salary: 2000.00 },
  { name: 'Luíza Dias', email: 'luiza.dias@gmail.com', phone: '(19) 99988-8776', sector: 'Financeiro', position: 'Contador', status: true, salary: 7000.00 },
  { name: 'Marina Pereira', email: 'marina.pereira@gmail.com', phone: '(19) 99887-7654', sector: 'Pátio', position: 'Vendedor', status: false, salary: 2500.00 },
  { name: 'Rafael Benitez', email: 'rafael.benitez@gmail.com', phone: '(19) 99876-5432', sector: 'Pátio', position: 'Vendedor', status: true, salary: 3000.00 },
  { name: 'Ronaldo Cordeiro', email: 'ronaldo.cordeiro@gmail.com', phone: '(19) 99887-7665', sector: 'Pátio', position: 'Manobrista', status: false, salary: 2000.00 },
  { name: 'Tiago Martins', email: 'tiago.martins@gmail.com', phone: '(19) 99887-6543', sector: 'Pátio', position: 'Vendedor', status: true, salary: 2500.00 },
]

export const employees: Employee[] = page1.map((item, i) => ({ id: i + 1, ...item }))