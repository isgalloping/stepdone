import { Suspense } from "react";
import { ObjectiveForm } from "@/components/steps/objective-form";

export default function NewProjectPage() {
  return (
    <div style={{ padding: "1.25rem" }}>
      <Suspense fallback={<div className="sd-card">加载中…</div>}>
        <ObjectiveForm />
      </Suspense>
    </div>
  );
}
