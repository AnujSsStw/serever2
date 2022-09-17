import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput";

export const registerVaildation = (registerOptions: UsernamePasswordInput) => {
  if (!registerOptions.email.includes("@")) {
    return [
      {
        field: "email",
        message: "invalid email",
      },
    ];
  }

  if (registerOptions.username.length <= 2) {
    return [
      {
        field: "username",
        message: "username must be at least 3 characters long",
      },
    ];
  }
  if (registerOptions.username.includes("@")) {
    return [
      {
        field: "username",
        message: "cannot includes @",
      },
    ];
  }
  if (registerOptions.password.length <= 2) {
    return [
      {
        field: "password",
        message: "password must be at least 3 characters long",
      },
    ];
  }
  return null;
};
