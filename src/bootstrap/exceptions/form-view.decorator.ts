import { SetMetadata } from '@nestjs/common';
export const FORM_VIEW = 'form-view';
export const FormView = (name: string) => SetMetadata(FORM_VIEW, name);