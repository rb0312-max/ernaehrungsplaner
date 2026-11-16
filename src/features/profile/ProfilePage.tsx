import { useMemo } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { newId } from '../../db/db';
import { createProfile, deleteProfile, saveProfile } from '../../db/profileRepository';
import { newProfileDraft } from '../../domain/profile';
import { BackupImport } from '../about/BackupImport';
import { BackupView } from '../about/BackupView';
import { InfoView } from '../about/InfoView';
import { ProfileEditor } from './ProfileEditor';
import { useProfiles } from './ProfileContext';

/** Ersteinrichtung beim ersten Start: legt das erste Profil an. */
export function FirstSetup() {
  const draft = useMemo(() => newProfileDraft(newId()), []);
  return (
    <main className="content">
      <h1>Willkommen</h1>
      <p className="muted">Lege dein Profil an. Die Daten bleiben auf diesem Gerät. Weitere Profile kannst du später unter „Profil“ ergänzen.</p>
      <ProfileEditor initial={draft} isNew onSave={createProfile} />
      <h2>Oder Sicherung einspielen</h2>
      <p className="muted small">Hast du die App schon auf einem anderen Gerät genutzt? Dann lade dort unter „Profil → Sicherung“ eine Datei herunter und wähle sie hier.</p>
      <BackupImport hasData={false} />
    </main>
  );
}

function NewProfile() {
  const navigate = useNavigate();
  const draft = useMemo(() => newProfileDraft(newId()), []);
  return (
    <section>
      <h1>Neues Profil</h1>
      <ProfileEditor
        initial={draft}
        isNew
        onSave={async (p) => {
          await createProfile(p);
          navigate('/profil');
        }}
        onCancel={() => navigate('/profil')}
      />
    </section>
  );
}

function EditProfile() {
  const { profiles, active, setActive } = useProfiles();
  if (!active) return null;

  async function remove() {
    if (!active) return;
    const msg = `Profil „${active.name}“ mit Tagebuch, Gewichtsverlauf und Einkaufslisten unwiderruflich löschen?`;
    if (window.confirm(msg)) await deleteProfile(active.id);
  }

  return (
    <section>
      <h1>Profil</h1>
      <div className="field">
        <label htmlFor="active">Aktives Profil</label>
        <div className="row">
          <select id="active" value={active.id} onChange={(e) => void setActive(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Link to="neu" className="button">Neu</Link>
        </div>
      </div>
      {/* key: beim Profilwechsel wird das Formular neu aufgebaut. */}
      <ProfileEditor key={active.id} initial={active} isNew={false} onSave={saveProfile} />
      <p>
        <button type="button" className="danger" onClick={() => void remove()}>
          Profil löschen
        </button>
      </p>
      <h2>Daten und Info</h2>
      <ul className="list">
        <li><Link to="sicherung">Sicherung: exportieren und importieren</Link></li>
        <li><Link to="info">Info: Quellen, Lizenzen, Installation</Link></li>
      </ul>
    </section>
  );
}

export function ProfilePage() {
  return (
    <Routes>
      <Route index element={<EditProfile />} />
      <Route path="neu" element={<NewProfile />} />
      <Route path="sicherung" element={<BackupView />} />
      <Route path="info" element={<InfoView />} />
    </Routes>
  );
}
