import { Transform, Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  LIFECYCLE_STAGE_KEYS,
  PRODUCT_HEALTH,
  PRODUCT_VISIBILITY,
} from "@ims/shared";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" || value === null ? undefined : value;

const emptyToNull = ({ value }: { value: unknown }) =>
  value === "" ? null : value;

const toNumberOrNull = ({ value }: { value: unknown }) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return Number(value);
};

export class ListProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(LIFECYCLE_STAGE_KEYS as unknown as string[])
  stage?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsIn(PRODUCT_HEALTH as unknown as string[])
  health?: string;

  @IsOptional()
  @IsIn(["updated_desc", "updated_asc", "name_asc", "created_desc"])
  sort?: string;

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
  pageSize: number = 10;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeArchived: boolean = false;
}

export class CreateProductMilestoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dueDate?: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(600)
  description!: string;

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  teamIds?: string[];

  @IsIn(LIFECYCLE_STAGE_KEYS as unknown as string[])
  stage!: "IDEATION" | "VALIDATION" | "MVP" | "PILOT" | "SCALE" | "MONETIZATION";

  @IsIn(PRODUCT_VISIBILITY as unknown as string[])
  visibility!: "EVERYONE" | "TEAMS" | "ADMINS_ONLY";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  businessArea?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  targetUsers?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  expectedImpact?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  launchTarget?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMilestoneDto)
  customMilestones?: CreateProductMilestoneDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  visibilityTeamIds?: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  teamIds?: string[];

  @IsOptional()
  @IsIn(PRODUCT_VISIBILITY as unknown as string[])
  visibility?: "EVERYONE" | "TEAMS" | "ADMINS_ONLY";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  businessArea?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  targetUsers?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  expectedImpact?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  launchTarget?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  visibilityTeamIds?: string[];
}

export class ListMilestonesDto {
  @IsOptional()
  @IsIn(LIFECYCLE_STAGE_KEYS as unknown as string[])
  stage?: string;
}

export class CreateMilestoneDto {
  @IsIn(LIFECYCLE_STAGE_KEYS as unknown as string[])
  stage!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  ownerId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  evidenceLink?: string;

  @IsOptional()
  @Transform(toNumberOrNull)
  @IsNumber()
  targetValue?: number | null;

  @IsOptional()
  @Transform(toNumberOrNull)
  @IsNumber()
  actualValue?: number | null;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  unit?: string;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  evidenceLink?: string | null;

  @IsOptional()
  @Transform(toNumberOrNull)
  @IsNumber()
  targetValue?: number | null;

  @IsOptional()
  @Transform(toNumberOrNull)
  @IsNumber()
  actualValue?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(20)
  unit?: string | null;
}

export class CompleteMilestoneDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  evidenceLink?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualValue?: number;
}

export class ReorderMilestonesDto {
  @IsIn(LIFECYCLE_STAGE_KEYS as unknown as string[])
  stage!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  ids!: string[];
}
