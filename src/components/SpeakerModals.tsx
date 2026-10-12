import { Form, Input, Upload } from "antd";
import type { UploadFile } from "antd";
import { FileUp } from "lucide-react";
import { FormModal, full } from "@/components/FormModal";
import { http, patch } from "@/lib/http";
import { useAction } from "@/lib/queries";
import type { Speaker, SpeakerUpdate } from "@/lib/types";

type MaterialForm = { title: string; description?: string; file: UploadFile[] };

export function MaterialUploadModal({ speaker, onClose }: { speaker: Speaker | null; onClose: () => void }) {
  const upload = useAction(({ id, v }: { id: string; v: MaterialForm }) => {
    const fd = new FormData();
    fd.append("title", v.title);
    if (v.description) fd.append("description", v.description);
    fd.append("file", v.file[0].originFileObj as File);
    return http.post(`/speakers/${id}/materials`, fd).then((r) => r.data);
  }, "Materi berhasil diunggah");
  return (
    <FormModal<MaterialForm>
      open={!!speaker}
      onClose={onClose}
      testId="material-form-modal"
      title="Upload Materi"
      description={speaker ? `${speaker.topic ?? "Sesi"} · ${speaker.event?.title ?? ""}` : undefined}
      pending={upload.isPending}
      submitLabel="Upload"
      onSubmit={(v) => speaker && upload.mutate({ id: speaker.id, v }, { onSuccess: onClose })}
    >
      <Form.Item name="title" label="Judul materi" className={full} rules={[{ required: true }]}><Input data-testid="material-form-title" /></Form.Item>
      <Form.Item name="description" label="Deskripsi" className={full}><Input.TextArea rows={2} data-testid="material-form-description" /></Form.Item>
      <Form.Item name="file" label="File (PDF / PPT / ZIP)" className={full} valuePropName="fileList" getValueFromEvent={(e: { fileList: UploadFile[] }) => e.fileList.slice(-1)} rules={[{ required: true, message: "Pilih file" }]}>
        <Upload.Dragger beforeUpload={() => false} maxCount={1} data-testid="material-form-file">
          <p className="py-2 text-sm text-ink-2"><FileUp className="mx-auto mb-2 size-6" />Klik atau seret file ke sini</p>
        </Upload.Dragger>
      </Form.Item>
    </FormModal>
  );
}

export function SessionEditModal({ speaker, onClose }: { speaker: Speaker | null; onClose: () => void }) {
  const save = useAction((v: SpeakerUpdate) => patch(`/speakers/${speaker!.id}`, v), "Sesi diperbarui");
  return (
    <FormModal<SpeakerUpdate>
      open={!!speaker}
      onClose={onClose}
      testId="session-form-modal"
      title="Edit Sesi"
      initialValues={speaker ?? undefined}
      pending={save.isPending}
      onSubmit={(v) => save.mutate(v, { onSuccess: onClose })}
    >
      <Form.Item name="topic" label="Topik" className={full} rules={[{ max: 200 }]}><Input data-testid="session-form-topic" /></Form.Item>
      <Form.Item name="bio" label="Bio speaker" className={full}><Input.TextArea rows={4} data-testid="session-form-bio" /></Form.Item>
    </FormModal>
  );
}

