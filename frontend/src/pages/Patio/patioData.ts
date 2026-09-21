export type PatioStatus = 'Disponível' | 'Reservado' | 'Preparação'

export type PatioVehicle = {
  id: number
  vaga: string
  bodyType: string
  name: string
  year: number
  engine: string
  status: PatioStatus
  plate: string
  km: number
  daysInLot: number
  price: number
}

export const lotCapacity = 12
export const staleThresholdDays = 45
export const targetAverageDays = 30

export const patioVehicles: PatioVehicle[] = [
  {
    id: 1,
    vaga: 'VAGA B-03',
    bodyType: 'SUV',
    name: 'Jeep Compass Limited',
    year: 2022,
    engine: '1.3 T270',
    status: 'Reservado',
    plate: 'QDJ-6633',
    km: 44500,
    daysInLot: 14,
    price: 174900,
  },
  {
    id: 2,
    vaga: 'VAGA B-07',
    bodyType: 'SUV',
    name: 'Chevrolet Tracker LTZ',
    year: 2023,
    engine: '1.2 Turbo',
    status: 'Reservado',
    plate: 'QDT-8842',
    km: 21300,
    daysInLot: 60,
    price: 132900,
  },
  {
    id: 3,
    vaga: 'VAGA A-01',
    bodyType: 'Sedan',
    name: 'Subaru WRX STI',
    year: 2019,
    engine: '2.5 Turbo',
    status: 'Disponível',
    plate: 'QDA-1101',
    km: 38400,
    daysInLot: 8,
    price: 130000,
  },
  {
    id: 4,
    vaga: 'VAGA C-05',
    bodyType: 'Hatch',
    name: 'VW Polo GTS',
    year: 2021,
    engine: '1.4 TSI',
    status: 'Disponível',
    plate: 'QDP-3312',
    km: 28000,
    daysInLot: 5,
    price: 98500,
  },
  {
    id: 5,
    vaga: 'VAGA D-02',
    bodyType: 'Sedan',
    name: 'BMW 320i',
    year: 2020,
    engine: '2.0 Turbo',
    status: 'Disponível',
    plate: 'QDB-7741',
    km: 52000,
    daysInLot: 6,
    price: 189900,
  },
  {
    id: 6,
    vaga: 'VAGA E-07',
    bodyType: 'SUV',
    name: 'Audi Q5',
    year: 2022,
    engine: '2.0 TFSI',
    status: 'Disponível',
    plate: 'QDA-5521',
    km: 31000,
    daysInLot: 4,
    price: 259900,
  },
  {
    id: 7,
    vaga: 'VAGA F-04',
    bodyType: 'Coupe',
    name: 'Porsche 718 Cayman S',
    year: 2021,
    engine: '2.5 Turbo',
    status: 'Preparação',
    plate: 'QDX-1122',
    km: 18500,
    daysInLot: 61,
    price: 412300,
  },
  {
    id: 8,
    vaga: 'VAGA G-09',
    bodyType: 'Picape',
    name: 'Toyota Hilux SRX',
    year: 2023,
    engine: '2.8 Diesel',
    status: 'Preparação',
    plate: 'QDH-9087',
    km: 41200,
    daysInLot: 65,
    price: 258700,
  },
  {
    id: 9,
    vaga: 'VAGA H-06',
    bodyType: 'Hatch',
    name: 'Honda Civic Si',
    year: 2020,
    engine: '1.5 Turbo',
    status: 'Disponível',
    plate: 'QDC-4456',
    km: 47600,
    daysInLot: 9,
    price: 149900,
  },
]
