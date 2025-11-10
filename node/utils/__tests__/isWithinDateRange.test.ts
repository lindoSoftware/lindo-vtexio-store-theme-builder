/// <reference types="jest" />
import { isWithinDateRange } from '../isWithinDateRange'

describe('isWithinDateRange (Argentina UTC-3)', () => {
  const mockNow = new Date('2025-11-10T13:01:00Z') // referencia de tiempo fija

  beforeAll(() => {
    // Congelamos la hora actual para que las pruebas sean determinísticas
    jest.useFakeTimers()
    jest.setSystemTime(mockNow)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('retorna true cuando la fecha actual está dentro del rango', () => {
    const beginning = '2025-09-17T03:00:00.000Z'
    const expiration = '2025-11-10T16:00:00.000Z'
    expect(isWithinDateRange(beginning, expiration)).toBe(true)
  })

  it('retorna false cuando la fecha actual es anterior al rango', () => {
    const beginning = '2025-12-01T03:00:00.000Z'
    const expiration = '2025-12-31T03:00:00.000Z'
    expect(isWithinDateRange(beginning, expiration)).toBe(false)
  })

  it('retorna false cuando la fecha actual es posterior al rango', () => {
    const beginning = '2025-08-01T03:00:00.000Z'
    const expiration = '2025-09-01T03:00:00.000Z'
    expect(isWithinDateRange(beginning, expiration)).toBe(false)
  })

  it('retorna false si falta beginning', () => {
    const expiration = '2025-12-31T03:00:00.000Z'
    expect(isWithinDateRange(undefined, expiration)).toBe(false)
  })

  it('retorna false si falta expiration', () => {
    const beginning = '2025-09-15T03:00:00.000Z'
    expect(isWithinDateRange(beginning, undefined)).toBe(false)
  })

  it('retorna false si ambas fechas faltan', () => {
    expect(isWithinDateRange(undefined, undefined)).toBe(false)
  })
})
