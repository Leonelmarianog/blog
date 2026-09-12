import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString() @MinLength(1) displayName!: string;

  @IsOptional() @IsString() @MinLength(8) newPassword?: string;
}
