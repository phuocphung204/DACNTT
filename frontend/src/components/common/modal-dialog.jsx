import { Button, Modal } from "react-bootstrap";
import { cloneElement, createElement } from "react";
import { uuid } from "zod";

import { userModalDialogStore, useShallow } from "#custom-hooks";

const renderComponent = (bodyComponent, bodyProps) => {
  if (typeof bodyComponent === "function") {
    return createElement(bodyComponent, { ...bodyProps, key: uuid() });
  } else if (bodyComponent) {
    const BodyComponent = bodyComponent;
    return cloneElement(BodyComponent, { ...bodyProps, key: uuid() });
  }
  return bodyComponent;
};

const ModalDialog = () => {
  const {
    show,
    size,
    title,
    bodyComponent,
    bodyProps,
    stack,
    pop,
    reset,
    buttons,
  } = userModalDialogStore(
    useShallow((zs) => ({
      show: zs.show,
      setShow: zs.setShow,
      size: zs.size,
      title: zs.title,
      bodyComponent: zs.bodyComponent,
      bodyProps: zs.bodyProps,
      stack: zs.stack,
      pop: zs.pop,
      reset: zs.reset,
      buttons: zs.buttons,
    }))
  );

  const handleHide = () => {
    if (stack.length > 1) {
      pop();
    } else {
      reset();
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleHide}
      size={size}
      aria-labelledby="contained-modal-title-vcenter"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="text-black">
        <Modal.Title id="contained-modal-title-vcenter">
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderComponent(bodyComponent, bodyProps)}
      </Modal.Body>
      <Modal.Footer>
        {buttons && buttons.map((btnComponent) => renderComponent(btnComponent))}
        {stack.length > 1 && (
          <Button variant="outline-secondary" onClick={pop}>
            Quay lại
          </Button>
        )}
        <Button variant="secondary" onClick={handleHide}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDialog;
