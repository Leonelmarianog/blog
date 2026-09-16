import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
