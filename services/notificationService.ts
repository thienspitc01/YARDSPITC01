
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Trình duyệt này không hỗ trợ thông báo.");
    return;
  }

  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    await Notification.requestPermission();
  }
};

export const sendNotification = (title: string, body: string, onClick?: () => void) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: "/vite.svg", // Sử dụng icon mặc định
    badge: "/vite.svg",
    tag: "port-alert", // Đè lên các thông báo cũ cùng tag
    requireInteraction: true // Giữ thông báo cho đến khi người dùng tương tác
  });

  notification.onclick = () => {
    window.focus();
    if (onClick) onClick();
    notification.close();
  };
};
