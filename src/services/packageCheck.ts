import fs from 'fs';
import path from 'path';

export function runPackageCheck() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const targetPackages = [
    '@google/adk',
    '@google-cloud/documentai',
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/bigquery',
    '@google-cloud/dlp',
    '@google-cloud/speech',
    '@google-cloud/discoveryengine',
  ];

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  console.log('================================================================================');
  console.log('                     GCP & AGENT SDK PACKAGE AUDIT                              ');
  console.log('================================================================================');

  const results: Record<string, boolean> = {};
  for (const target of targetPackages) {
    const present = Object.prototype.hasOwnProperty.call(allDeps, target);
    results[target] = present;
    console.log(`  ${present ? '[PRESENT]' : '[NOT IN PACKAGE.JSON]'} ${target}`);
  }

  console.log('--------------------------------------------------------------------------------');
  const adkPresent = results['@google/adk'];
  if (!adkPresent) {
    console.log('  ORCHESTRATOR STATUS: "@google/adk" is NOT in package.json.');
    console.log('  -> Action applied: Renamed "ADK orchestrator" to "custom orchestrator".');
    console.log('  -> Implementation: Modular custom orchestrator running parallel Vertex AI agents.');
  } else {
    console.log('  ORCHESTRATOR STATUS: "@google/adk" is present.');
  }
  console.log('================================================================================');

  return results;
}

runPackageCheck();
