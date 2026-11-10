import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  COMPETENCIES,
  PEER_EVALUATOR_STAGES,
  SPECIALIZATIONS,
  EVALUATOR_STATUSES,
} from "@ims/shared";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" || value === null ? undefined : value;

export class ApplyEvaluatorDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  jobTitle?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  motivation?: string;
}

export class SaveAnswersDto {
  @IsObject()
  answers!: Record<string, number>;
}

export class QuestionDto {
  @IsIn(COMPETENCIES as unknown as string[])
  competency!: (typeof COMPETENCIES)[number];

  @IsString()
  @Length(10, 600)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 300, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  @Max(5)
  correctIndex!: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(600)
  explanation?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsIn(COMPETENCIES as unknown as string[])
  competency?: (typeof COMPETENCIES)[number];

  @IsOptional()
  @IsString()
  @Length(10, 600)
  prompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 300, { each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  correctIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  explanation?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ConfigDto {
  @IsInt()
  @Min(5)
  @Max(100)
  questionCount!: number;

  @IsInt()
  @Min(5)
  @Max(240)
  durationMinutes!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  passScore!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts!: number;

  @IsInt()
  @Min(0)
  @Max(90)
  retakeAfterDays!: number;

  @IsInt()
  @Min(1)
  @Max(60)
  authorizationMonths!: number;

  @IsObject()
  weights!: Record<string, number>;
}
export class AuthorizeDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(SPECIALIZATIONS as unknown as string[], { each: true })
  specializations!: (typeof SPECIALIZATIONS)[number][];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PEER_EVALUATOR_STAGES as unknown as string[], { each: true })
  stages!: (typeof PEER_EVALUATOR_STAGES)[number][];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateAuthorizationDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(SPECIALIZATIONS as unknown as string[], { each: true })
  specializations?: (typeof SPECIALIZATIONS)[number][];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PEER_EVALUATOR_STAGES as unknown as string[], { each: true })
  stages?: (typeof PEER_EVALUATOR_STAGES)[number][];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  validUntil?: string;
}

export class NoteDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AssignProductsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  productIds!: string[];
}

export class ListApplicantsDto {
  @IsOptional()
  @IsIn([...EVALUATOR_STATUSES, "all", "registry"] as string[])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class ListQuestionsDto {
  @IsOptional()
  @IsIn([...COMPETENCIES, "all"] as string[])
  competency?: string;

  @IsOptional()
  @IsIn(["active", "inactive", "all"])
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
