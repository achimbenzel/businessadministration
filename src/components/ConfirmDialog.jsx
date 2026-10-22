// "Are you sure?" as a promise: const { confirm, dialog } = useConfirm();
// if (await confirm({ title, message, confirmLabel, danger })) …  — render {dialog}.
import { useCallback, useState } from 'react';
import Modal from './Modal.jsx';

export function useConfirm() {
  const [req, setReq] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = (ok) => { req?.resolve(ok); setReq(null); };
  const dialog = req && (
    <Modal title={req.title} onClose={() => close(false)} size="sm"
      footer={(
        <>
          <button className="btn btn-ghost" onClick={() => close(false)}>Abbrechen</button>
          <button className={`btn ${req.danger ? 'btn-danger-solid' : 'btn-primary'}`} data-autofocus onClick={() => close(true)}>
            {req.confirmLabel || 'OK'}
          </button>
        </>
      )}>
      {req.message && <p className="modal-text">{req.message}</p>}
    </Modal>
  );
  return { confirm, dialog };
}
