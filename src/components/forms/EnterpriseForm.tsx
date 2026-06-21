import * as React from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type Path,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodSchema } from "zod";

import { cn } from "@/lib/utils";

interface EnterpriseFormProps<T extends FieldValues> {
  schema: ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit: SubmitHandler<T>;
  /** Persist unsaved draft per key in localStorage. When omitted, no draft. */
  draftKey?: string;
  /** Warn the user when leaving with unsaved changes (default true when draftKey set) */
  warnOnUnsavedChanges?: boolean;
  children: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode);
  className?: string;
  formProps?: Omit<UseFormProps<T>, "defaultValues" | "resolver">;
  id?: string;
}

/**
 * Enterprise-grade form wrapper:
 * - Zod schema validation via react-hook-form
 * - Optional auto-save draft to localStorage (debounced)
 * - beforeunload warning when dirty
 * - Exposes the form via children render prop OR FormProvider context
 */
export function EnterpriseForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  draftKey,
  warnOnUnsavedChanges,
  children,
  className,
  formProps,
  id,
}: EnterpriseFormProps<T>) {
  // Load draft on first mount
  const initialValues = React.useMemo<DefaultValues<T> | undefined>(() => {
    if (!draftKey || typeof window === "undefined") return defaultValues;
    try {
      const raw = window.localStorage.getItem(`form-draft:${draftKey}`);
      if (!raw) return defaultValues;
      const parsed = JSON.parse(raw);
      return { ...(defaultValues ?? {}), ...parsed } as DefaultValues<T>;
    } catch {
      return defaultValues;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onBlur",
    ...formProps,
  });

  const { watch, formState } = form;
  const shouldWarn = warnOnUnsavedChanges ?? !!draftKey;

  // Autosave draft (debounced 500ms)
  React.useEffect(() => {
    if (!draftKey) return;
    const sub = watch((values) => {
      const handle = window.setTimeout(() => {
        try {
          window.localStorage.setItem(`form-draft:${draftKey}`, JSON.stringify(values));
        } catch {
          /* ignore */
        }
      }, 500);
      return () => window.clearTimeout(handle);
    });
    return () => sub.unsubscribe();
  }, [watch, draftKey]);

  // beforeunload guard
  React.useEffect(() => {
    if (!shouldWarn) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (formState.isDirty && !formState.isSubmitSuccessful) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn, formState.isDirty, formState.isSubmitSuccessful]);

  const handleSubmit: SubmitHandler<T> = async (values) => {
    await onSubmit(values);
    if (draftKey) {
      try {
        window.localStorage.removeItem(`form-draft:${draftKey}`);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <FormProvider {...form}>
      <form
        id={id}
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-4", className)}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  );
}

/**
 * Conditional field renderer — only mounts its children when `when(values)` is true.
 * Use this to keep validation accurate (unmounted fields are excluded from RHF state).
 */
export function ConditionalField<T extends FieldValues>({
  when,
  children,
}: {
  when: (values: T) => boolean;
  children: React.ReactNode;
}) {
  const { watch } = useFormContext<T>();
  const values = watch();
  return when(values) ? <>{children}</> : null;
}

/** Re-export name path helper */
export type FieldPath<T extends FieldValues> = Path<T>;
