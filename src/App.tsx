import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { DiaryPage } from './features/diary/DiaryPage';
import { DiaryTargetProvider } from './features/diary/DiaryTarget';
import { FoodsPage } from './features/foods/FoodsPage';
import { NutrientsPage } from './features/nutrients/NutrientsPage';
import { ProfileContext, useProfileState } from './features/profile/ProfileContext';
import { FirstSetup, ProfilePage } from './features/profile/ProfilePage';
import { RecipesPage } from './features/recipes/RecipesPage';

/** Hauptbereiche der App. */
const SECTIONS = [
  { path: 'heute', label: 'Heute', element: <DiaryPage /> },
  { path: 'lebensmittel', label: 'Lebensmittel', element: <FoodsPage /> },
  { path: 'rezepte', label: 'Rezepte', element: <RecipesPage /> },
  { path: 'naehrstoffe', label: 'Nährstoffe', element: <NutrientsPage /> },
  { path: 'profil', label: 'Profil', element: <ProfilePage /> },
] as const;

export function App() {
  const profiles = useProfileState();
  if (!profiles) return <p className="content muted">Lädt …</p>;
  // Ersteinrichtung: ohne Profil gibt es nichts anderes zu tun.
  if (!profiles.active) return <FirstSetup />;
  return (
    <ProfileContext.Provider value={profiles}>
      <DiaryTargetProvider>
      <div className="app">
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/heute" replace />} />
            {SECTIONS.map((s) => (
              <Route key={s.path} path={`/${s.path}/*`} element={s.element} />
            ))}
          </Routes>
        </main>
        <nav className="tabbar" aria-label="Hauptnavigation">
          {SECTIONS.map((s) => (
            <NavLink key={s.path} to={`/${s.path}`} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      </DiaryTargetProvider>
    </ProfileContext.Provider>
  );
}
