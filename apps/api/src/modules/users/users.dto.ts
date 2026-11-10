import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ROLE_CODES } from "@ims/shared";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsIn(ROLE_CODES as unknown as string[])
  role!: "ADMIN" | "EVALUATOR" | "PRODUCT_OWNER" | "DEVELOPER";

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  teamIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsIn(ROLE_CODES as unknown as string[])
  role?: "ADMIN" | "EVALUATOR" | "PRODUCT_OWNER" | "DEVELOPER";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  teamIds?: string[];
}

export class ImportDeveloperRowDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsString()
  @MaxLength(60)
  team?: string;
}

export class CommitImportDto {
  @IsArray()
  @ArrayMaxSize(1000, { message: "Import is limited to 1,000 developers at a time" })
  @ValidateNested({ each: true })
  @Type(() => ImportDeveloperRowDto)
  rows!: ImportDeveloperRowDto[];
}
