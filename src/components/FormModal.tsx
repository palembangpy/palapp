import type { ReactNode } from "react";
import { Button, Form, Modal } from "antd";

/** Modal + antd Form; remounts on every open so initialValues are always fresh. */
export function FormModal<T extends object>({
  open,
  onClose,
  title,
  description,
  initialValues,
  onSubmit,
  pending,
  submitLabel = "Simpan",
  testId,
  children,
  width = 640,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  initialValues?: Partial<T>;
  onSubmit: (v: T) => void;
  pending?: boolean;
  submitLabel?: string;
  testId: string;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} destroyOnHidden width={width} title={<span className="text-xl font-bold tracking-tight">{title}</span>} data-testid={testId}>
      {description && <p className="-mt-1 mb-4 text-sm text-ink-3">{description}</p>}
      <Form<T> layout="vertical" initialValues={initialValues} onFinish={onSubmit} requiredMark={false} data-testid={`${testId}-form`}>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">{children}</div>
        <div className="mt-2 flex justify-end gap-2">
          <Button shape="round" onClick={onClose} data-testid={`${testId}-cancel`}>Batal</Button>
          <Button shape="round" type="primary" htmlType="submit" loading={pending} data-testid={`${testId}-submit`}>{submitLabel}</Button>
        </div>
      </Form>
    </Modal>
  );
}

export const full = "sm:col-span-2";
