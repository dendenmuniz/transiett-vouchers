import { ZodError } from 'zod';


type Flat = { fieldErrors: Record<string, string[]>; formErrors: string[] };

export function expectZodFail(
  result: { success: boolean; error?: ZodError },
  fields: string[]
) {
  expect(result.success).toBe(false);
  const { fieldErrors } = (result.error as ZodError).flatten() as Flat; // 👈 cast
  for (const f of fields) {
     expect(fieldErrors[f]).toBeDefined();
    expect(fieldErrors[f]!.length).toBeGreaterThan(0);
  }

}

export function printZodIssues(result: any) {
  if (result?.success === false) {
    // útil para debugar quando algo falhar
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result.error.issues, null, 2));
  }
}