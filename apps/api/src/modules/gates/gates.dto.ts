import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === "" || value === null ? undefined : value;

export class SubmitGateDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class GateDecisionDto {
  @IsIn(["APPROVED", "REJECTED", "PARKED"])
  decision!: "APPROVED" | "REJECTED" | "PARKED";

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

