import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString() selector!: string;
  @IsString() verifier!: string;
}
