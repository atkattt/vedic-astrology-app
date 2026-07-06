// Minimal ambient declaration for the pure-JS `ephemeris` package (no bundled
// types). We only use getAllPlanets and read `apparentLongitudeDd`.
declare module "ephemeris" {
  type ObservedBody = {
    apparentLongitudeDd: number
    [key: string]: unknown
  }

  const ephemeris: {
    getAllPlanets: (
      date: Date,
      longitude: number,
      latitude: number,
      height: number,
    ) => {
      observed: Record<string, ObservedBody>
      [key: string]: unknown
    }
  }

  export default ephemeris
}
