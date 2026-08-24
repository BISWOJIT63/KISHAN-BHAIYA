export default function UserAvatar({ user, className = "h-10 w-10 rounded-full" }) {
  const initials = user?.name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "KB";

  if (user?.profileImage) {
    return (
      <img
        src={user.profileImage}
        alt={`${user.name || "User"} profile`}
        className={`${className} shrink-0 object-cover`}
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
