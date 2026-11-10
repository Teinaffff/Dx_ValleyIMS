import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" || value === null ? undefined : value;

export class CreatePublicIdeaDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  jobTitle?: string;

  @IsString()
  @Length(4, 120)
  title!: string;

  // Optional here: the service requires them (20+ chars) unless the idea
  // comes with at least one attachment (voice note, video, image, document).
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  problem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  solution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  expectedImpact?: string;
}

export class ListIdeasDto {
  @IsOptional()
  @IsIn(["all", "pending", "approved", "deleted"])
  status?: string = "all";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(["newest", "oldest"])
  sort?: string = "newest";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 12;
}

export class UpdateIdeaStatusDto {
  @IsIn(["APPROVED", "PENDING"])
  status!: "APPROVED" | "PENDING";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class DeleteIdeaDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
