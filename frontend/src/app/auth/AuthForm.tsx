'use client';

import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { createSessionState,saveAuthSession } from "../../features/auth/utils/auth-storage";
import { LoginResponse } from "../../features/auth/types/auth.types";

export default function AuthForm() {
  const auth = useAuth();

  const [userInfo, setUserInfo] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function getErrors() 
  {
    const errors: { email?: string; password?: string } = {};

    if (!userInfo.email.includes("@")) 
    {
      errors.email = "invalid email";
    }

    if (userInfo.password.length < 6) 
    {
      errors.password = "min 6 chars";
    }

    return errors;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) 
  {
    const { name, value } = e.target;

    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleLogin() 
  {
    const validationErrors = getErrors();

    if (Object.keys(validationErrors).length > 0) 
    {
      setErrors(validationErrors);
      return;
    }

    try 
    {
      const loginResponse = await auth.login({
        email: userInfo.email,
        password: userInfo.password,
      });

      const expiresInSeconds = loginResponse.expiresAt? Math.max(0,Math.floor((loginResponse.expiresAt - Date.now()) / 1000)): 0;

      const session = createSessionState({
        user: loginResponse.user,
        accessToken: loginResponse.accessToken ?? "",
        refreshToken: loginResponse.refreshToken,
        expiresInSeconds,
      });

      saveAuthSession(session);

      console.log("logged in:", session.user);
    } 
    catch (e) 
    {
      console.error(e);
    }
  }

  return (
    <AppShell title="Login">
      <form className="flex flex-col gap-3" onSubmit={(e) => {e.preventDefault();handleLogin();}}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="text" value={userInfo.email} onChange={handleChange} className="border px-2 py-1"/>
        {errors.email && (<span className="text-red-500 text-sm">{errors.email}</span>)}

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={userInfo.password} onChange={handleChange} className="border px-2 py-1"/>
        {errors.password && (<span className="text-red-500 text-sm">{errors.password}</span>)}

        <button type="submit"className="border border-gray-500 px-4 py-2 rounded-md hover:bg-black hover:text-white transition">login
        </button>
      </form>
    </AppShell>
  );
}