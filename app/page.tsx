'use client'

import { Button } from "@/components/ui/button";
import { Show, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
return (
  <div className='relative min-h-screen overflow-hidden'>
    {/* Background Pattern */}
    <div className='absolute inset-0 z-0' aria-hidden='true'>
      <div
        className='absolute inset-0 opacity-20'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2355C694' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "300px",
        }}
      />
      <div className='absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-purple-500/10' />
      <div className='absolute inset-0 bg-linear-to-tr from-yellow-500/5 via-transparent to-green-500/5' />
    </div>

    {/* Content */}
    <main className='relative z-10 min-h-screen flex flex-col items-center justify-center p-6'>
      <h1 className='sr-only'>AFD Guru — African Fabric Tailoring Management</h1>

      <div className='absolute top-6 right-6 flex items-center gap-4'>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>

      {/* Logo Section — rendered immediately for LCP, animated via CSS */}
      <div className='flex flex-col items-center justify-center relative'>
        <div className='relative w-72.5 h-72.5 sm:w-82.5 sm:h-82.5 animate-spin-slower'>
          <Image
            alt='AFD Guru — African Fabrics tailoring management logo'
            src='/logo/logo_name.webp'
            fill
            priority
            sizes='(min-width: 640px) 330px, 290px'
            className='object-contain'
          />
        </div>

        <div className='absolute inset-0 flex justify-center items-center'>
          <div className='relative w-40 sm:w-47.5 aspect-video bg-white/20 rounded-3xl'>
            <Image
              alt='AFD Guru brand mark'
              src='/logo/logo.jpg'
              fill
              priority
              sizes='(min-width: 640px) 190px, 160px'
              className='object-cover rounded-xl'
            />
          </div>
        </div>
      </div>

      {/* Sign In Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className='mt-8'>
        <Show when="signed-out">
          <Button asChild>
            <Link href='/sign-in'>Sign In</Link>
          </Button>
        </Show>
        <Show when="signed-in">
          <Button asChild>
            <Link href='/dashboard'>Dashboard</Link>
          </Button>
        </Show>
      </motion.div>

      {/* Footer */}
      <footer className='absolute bottom-6 text-center text-sm text-muted-foreground'>
        <p>© 2026 African Fabrics. All rights reserved.</p>
      </footer>
    </main>
  </div>
);}
