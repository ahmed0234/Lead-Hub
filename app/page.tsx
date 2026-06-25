import { Button } from "@/components/ui/button";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const page = () => {
  return (
    <div>
      <Show when="signed-in">
        <h1 className="text-5xl text-rose-600 font-semibold">Sass</h1>
        <Button className="cursor-pointer text-xl p-5">Click me!</Button>
        <UserButton />
      </Show>

      <Show when="signed-out">
        <h1 className="text-5xl text-rose-600 font-semibold">
          Welcome to Lead Hub
        </h1>

        <SignInButton>
          <Button>Login</Button>
        </SignInButton>
      </Show>
    </div>
  );
};

export default page;
