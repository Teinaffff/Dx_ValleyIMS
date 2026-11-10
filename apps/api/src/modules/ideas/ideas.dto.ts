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
  @IsIn(["all", "pending", "approved", "parked", "rejected", "deleted"])
  status?: string = "all";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(["newest", "oldest", "score"])
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

export class ScoreIdeaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  feasibility!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  strategicFit!: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class TrackIdeaDto {
  @IsString()
  @Length(4, 16)
  reference!: string;

  // New ideas are tracked with the access code issued at submission.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(4, 32)
  accessCode?: string;

  // Only ideas submitted before access codes existed fall back to the email.
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(160)
  email?: string;
}

export class ReissueIdeaCodeDto {
  @IsString()
  @Length(4, 16)
  reference!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;
}

export class RejectIdeaDto {
  // A rejection is a decision, so it always carries a written reason. The
  // reason stays internal; the submitter only gets a neutral message.
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ParkIdeaDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  note?: string;
}
