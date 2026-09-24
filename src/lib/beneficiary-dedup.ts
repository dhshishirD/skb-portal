export interface BeneficiaryRecord {
  fullName: string;
  birthYear: number;
  locationCode: string;
}

export function generateDedupHash(record: BeneficiaryRecord): string {
  const normalizedName = record.fullName.trim().toLowerCase().replace(/\s+/g, '');
  return `${normalizedName}_${record.birthYear}_${record.locationCode.trim().toUpperCase()}`;
}

export function isPotentialDuplicate(
  newRecord: BeneficiaryRecord,
  existingRecords: BeneficiaryRecord[]
): boolean {
  const newHash = generateDedupHash(newRecord);
  return existingRecords.some((existing) => generateDedupHash(existing) === newHash);
}
