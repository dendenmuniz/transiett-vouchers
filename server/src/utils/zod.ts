import { ZodError, ZodIssue } from 'zod';

export function zodIssues(err: ZodError) {
  return err.issues.map((i: ZodIssue) => ({
    path: i.path.join('.'),
    code: i.code,          
    message: i.message,     
  }));
}


export function zodStatus(err: ZodError) {
  const hasBusinessRule = err.issues.some(i => i.code === 'custom');
  return hasBusinessRule ? 422 : 400;
}
