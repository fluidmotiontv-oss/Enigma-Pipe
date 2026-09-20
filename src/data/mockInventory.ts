import { AuditRecord, SchemaAnalysis } from '../types';

const STAGES: AuditRecord['pipeline_stage'][] = ['raw_ingest', 'transformation', 'feature_store', 'archived', 'staging'];
const STORAGE_CLASSES: AuditRecord['storage_class'][] = ['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'];
const SERVICES: AuditRecord['owner_service'][] = ['enigma-ingest', 'enigma-etl', 'enigma-analytics', 'enigma-export'];
const FORMATS: AuditRecord['metadata']['format'][] = ['parquet', 'json', 'csv', 'avro', 'orc'];
const COMPRESSIONS: AuditRecord['metadata']['compression'][] = ['gzip', 'snappy', 'zstd', 'none'];

// Helper to generate dynamic mock audit inventory
export function generateMockAuditInventory(count: number = 250): AuditRecord[] {
  const records: AuditRecord[] = [];
  const baseTimestamp = new Date('2026-07-29T22:31:00Z').getTime();

  for (let i = 1; i <= count; i++) {
    const stage = STAGES[i % STAGES.length];
    const storageClass = STORAGE_CLASSES[(i * 3) % STORAGE_CLASSES.length];
    const service = SERVICES[i % SERVICES.length];
    const format = FORMATS[i % FORMATS.length];
    const compression = COMPRESSIONS[i % COMPRESSIONS.length];
    
    // Generate realistic relative and absolute paths
    const year = 2026;
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const fileName = `enigma_batch_${i.toString().padStart(5, '0')}_${stage}.${format}${compression !== 'none' ? '.' + compression : ''}`;
    const filePath = `/home/tim/work/enigma-pipeline/storage/${stage}/${year}/${month}/${day}/${fileName}`;
    const storageUri = `gs://enigma-data-lake-prod/${stage}/${year}/${month}/${fileName}`;

    const isCorrupt = i % 47 === 0;
    const isUnencrypted = i % 31 === 0;
    const isStale = i % 19 === 0;
    const isWarning = isUnencrypted || isStale;

    let healthStatus: AuditRecord['health_status'] = 'healthy';
    if (isCorrupt) healthStatus = 'corrupt';
    else if (isStale) healthStatus = 'stale';
    else if (isWarning) healthStatus = 'warning';

    const sizeBytes = Math.floor(Math.random() * 15000000) + 10240; // 10KB to 15MB
    const createdOffset = (count - i) * 3600000 * 2; // spaced out by hours
    const createdDate = new Date(baseTimestamp - createdOffset).toISOString();

    records.push({
      record_id: `rec_eng_${String(i).padStart(6, '0')}`,
      file_path: filePath,
      storage_uri: storageUri,
      size_bytes: sizeBytes,
      checksum_sha256: isCorrupt ? '' : `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8${i.toString().padStart(4, '0')}`,
      pipeline_stage: stage,
      storage_class: storageClass,
      owner_service: service,
      created_at: createdDate,
      last_modified: createdDate,
      is_encrypted: !isUnencrypted,
      retention_days: storageClass === 'ARCHIVE' ? 365 : storageClass === 'COLDLINE' ? 180 : 90,
      tags: [`stage:${stage}`, `format:${format}`, `env:production`, `partition:${year}${month}`],
      metadata: {
        format,
        compression,
        record_count: Math.floor(sizeBytes / 120),
        partition_key: `${year}-${month}-${day}`
      },
      health_status: healthStatus
    });
  }

  return records;
}

export const INITIAL_AUDIT_DATA = generateMockAuditInventory(300);

export function analyzeInventorySchema(records: AuditRecord[]): SchemaAnalysis {
  const totalSizeBytes = records.reduce((acc, r) => acc + r.size_bytes, 0);

  const stagesBreakdown: Record<string, number> = {};
  const storageClassBreakdown: Record<string, number> = {};
  const healthBreakdown: Record<string, number> = {};

  records.forEach(r => {
    stagesBreakdown[r.pipeline_stage] = (stagesBreakdown[r.pipeline_stage] || 0) + 1;
    storageClassBreakdown[r.storage_class] = (storageClassBreakdown[r.storage_class] || 0) + 1;
    healthBreakdown[r.health_status] = (healthBreakdown[r.health_status] || 0) + 1;
  });

  const keyStatsMap: Record<string, { count: number; types: Set<string>; samples: Set<string> }> = {};

  const recordSample = records.slice(0, 50);
  recordSample.forEach(r => {
    Object.entries(r).forEach(([k, v]) => {
      if (!keyStatsMap[k]) {
        keyStatsMap[k] = { count: 0, types: new Set(), samples: new Set() };
      }
      keyStatsMap[k].count++;
      keyStatsMap[k].types.add(typeof v);
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        if (keyStatsMap[k].samples.size < 3) {
          keyStatsMap[k].samples.add(String(v));
        }
      }
    });
  });

  const keyOccurrences = Object.entries(keyStatsMap).map(([key, stat]) => ({
    key,
    type: Array.from(stat.types).join(' | '),
    count: Math.round((stat.count / recordSample.length) * records.length),
    percentage: Math.round((stat.count / recordSample.length) * 100),
    sampleValues: Array.from(stat.samples)
  })).sort((a, b) => b.count - a.count);

  return {
    totalRecords: records.length,
    totalSizeBytes: totalSizeBytes || 3145728, // approx 3.0MB
    keyOccurrences,
    stagesBreakdown,
    storageClassBreakdown,
    healthBreakdown,
    suggestedKeys: {
      searched: 'path',
      matches: ['file_path', 'storage_uri'],
      explanation: 'In audit_inventory.json, the file location is stored under the keys "file_path" and "storage_uri". Searching for the literal key "path" yields 0 matches because the word "path" alone does not exist as an independent key.'
    }
  };
}
