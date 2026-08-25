import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString() selector!: string;
  @IsString() verifier!: string;
  @IsString() @MinLength(8) newPassword!: string;
}
