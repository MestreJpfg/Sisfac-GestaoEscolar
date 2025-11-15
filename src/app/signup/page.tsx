import SignUpForm from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  );
}
