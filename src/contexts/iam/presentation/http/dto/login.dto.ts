import { IsEmail, IsString, MinLength, IsBooleanString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  /** HTML checkbox submits the string `'1'` (or omits the field); the global ValidationPipe runs
   * with `transform: false`, so accept the boolean-string form and coerce in the controller. */
  @IsOptional() @IsBooleanString() rememberMe?: string;
}
