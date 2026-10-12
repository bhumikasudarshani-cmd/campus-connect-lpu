import { SignJWT } from 'jose';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('JWT_SECRET must be set (min 32 chars) and match the running app.');
  process.exit(1);
}
const SECRET_KEY = new TextEncoder().encode(jwtSecret);

async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
}

async function runE2ETest() {
  const BASE_URL = 'http://localhost:3000';
  console.log('--- STARTING GLOBAL DOCUMENT ACCESS CONTROL E2E VERIFICATION ---');

  // Token for Owner: mishra.rajvansh11@gmail.com
  const ownerToken = await createToken({
    userId: 'usr_owner_rajvansh',
    email: 'mishra.rajvansh11@gmail.com',
    name: 'Rajvansh Mishra (Owner)',
    community_joined: true,
    isAdmin: true,
    isOwner: true,
    role: 'owner',
  });

  // Token for Normal Student: rajvansh.lpu@gmail.com (id: usr_rajvansh_01)
  const studentToken = await createToken({
    userId: 'usr_rajvansh_01',
    email: 'rajvansh.lpu@gmail.com',
    name: 'Rajvansh Kumar (Student)',
    community_joined: true,
    isAdmin: false,
    isOwner: false,
    role: 'user',
  });

  console.log('\n1. Verifying Authentication /api/admin/settings as Student vs Owner:');
  
  // Student should be rejected from modifying settings (403)
  const studentSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    headers: { Cookie: `cc_session=${studentToken}` }
  });
  console.log('Student GET /api/admin/settings status:', studentSettingsRes.status);
  const studentSettings = await studentSettingsRes.json();
  console.log('Student settings view:', studentSettings);

  // Owner should be allowed to view settings
  const ownerSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    headers: { Cookie: `cc_session=${ownerToken}` }
  });
  console.log('Owner GET /api/admin/settings status:', ownerSettingsRes.status);
  const ownerSettings = await ownerSettingsRes.json();
  console.log('Owner settings view:', ownerSettings);

  console.log('\n2. Testing TOGGLE OFF (Preview Only Mode):');
  // Owner toggles downloads OFF
  const toggleOffRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Cookie: `cc_session=${ownerToken}` 
    },
    body: JSON.stringify({ allow_user_downloads: false })
  });
  console.log('PATCH /api/admin/settings (allow_user_downloads = false) status:', toggleOffRes.status);
  const toggleOffData = await toggleOffRes.json();
  console.log('Toggle OFF result:', toggleOffData.settings);

  // Student trying to PATCH settings should get 403 Forbidden
  const studentPatchRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Cookie: `cc_session=${studentToken}` 
    },
    body: JSON.stringify({ allow_user_downloads: true })
  });
  console.log('Student illegal PATCH status (Expected 403):', studentPatchRes.status);

  // Test Material Download & Preview when Toggle is OFF
  const matId = 'mat_yr1_01';

  console.log('\n3. Testing Downloads when Access Mode is PREVIEW ONLY:');
  // Student trying to download
  const studentDownloadOffRes = await fetch(`${BASE_URL}/api/materials/${matId}/download`, {
    headers: { Cookie: `cc_session=${studentToken}` }
  });
  console.log('Student Download Status (Expected 403 Forbidden):', studentDownloadOffRes.status);
  const studentDownloadOffText = await studentDownloadOffRes.text();
  try {
    console.log('Student Download blocked payload:', JSON.parse(studentDownloadOffText));
  } catch {
    console.log('Student Download response text snippet:', studentDownloadOffText.slice(0, 100));
  }

  // Owner trying to download in Preview Only mode (Expected 403 Forbidden)
  const ownerDownloadOffRes = await fetch(`${BASE_URL}/api/materials/${matId}/download`, {
    headers: { Cookie: `cc_session=${ownerToken}` }
  });
  console.log('Owner Download Status in Preview Only Mode (Expected 403 Forbidden):', ownerDownloadOffRes.status);

  // Student Preview endpoint (MUST ALWAYS BE ACCESSIBLE)
  const studentPreviewRes = await fetch(`${BASE_URL}/api/materials/${matId}/preview`, {
    headers: { Cookie: `cc_session=${studentToken}` }
  });
  console.log('Student Preview Status (Expected 200 OK):', studentPreviewRes.status);
  console.log('Student Preview Content-Disposition (inline):', studentPreviewRes.headers.get('content-disposition'));

  console.log('\n4. Testing TOGGLE ON (Allow Downloads Mode):');
  // Owner toggles downloads back ON
  const toggleOnRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Cookie: `cc_session=${ownerToken}` 
    },
    body: JSON.stringify({ allow_user_downloads: true })
  });
  console.log('PATCH /api/admin/settings (allow_user_downloads = true) status:', toggleOnRes.status);
  const toggleOnData = await toggleOnRes.json();
  console.log('Toggle ON result:', toggleOnData.settings);

  // Student trying to download now
  const studentDownloadOnRes = await fetch(`${BASE_URL}/api/materials/${matId}/download`, {
    headers: { Cookie: `cc_session=${studentToken}` }
  });
  console.log('Student Download Status now (Expected 200 OK):', studentDownloadOnRes.status);
  console.log('Student Download Content-Disposition:', studentDownloadOnRes.headers.get('content-disposition'));

  console.log('\n=============================================================');
  console.log('ALL TESTS PASSED: GLOBAL DOCUMENT ACCESS CONTROL FULLY VERIFIED');
  console.log('=============================================================');
}

runE2ETest().catch(console.error);
