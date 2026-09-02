import React from "react";
import { assetUrl } from "../utils/assets.js";

export default function UserAvatar({ user, className = "h-10 w-10 rounded-full" }) {
  const initials = user?.name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "KB";

  // Uploads are stored as an absolute API url, but older records may still hold a
  // root-relative `/uploads/...` path, which has to be re-based onto the API
  // origin or it resolves against the frontend and never loads.
  const src = assetUrl(user?.profileImage);
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [src]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={`${user.name || "User"} profile`}
        className={`${className} shrink-0 bg-forest-50 object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={`${className} grid shrink-0 place-items-center bg-forest-900 font-display font-bold text-white`}
      aria-label={`${user?.name || "User"} initials`}
    >
      {initials}
    </span>
  );
}
