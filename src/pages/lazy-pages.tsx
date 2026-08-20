/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, type ReactNode } from "react";
import type { CollectionKey } from "@/site/config";

const ContentPage = lazy(() => import("@/pages/content-page").then((module) => ({ default: module.ContentPage })));
const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })));
const HubPage = lazy(() => import("@/pages/hub-page").then((module) => ({ default: module.HubPage })));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>;
}

export function homeElement() {
  return withSuspense(<HomePage />);
}

export function hubElement(collections: CollectionKey[], description: string, title: string) {
  return withSuspense(<HubPage collections={collections} description={description} title={title} />);
}

export function contentElement(collection: CollectionKey) {
  return withSuspense(<ContentPage collection={collection} />);
}

export function staticPage(name: "GetAppPage" | "NotFoundPage" | "PrivacyFeaturesPage" | "PrivacyPage" | "SupportPage" | "TermsPage") {
  const Component = lazy(() => import("@/pages/static-pages").then((module) => ({ default: module[name] })));
  return withSuspense(<Component />);
}
