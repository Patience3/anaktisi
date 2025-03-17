// app/login/page.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function LoginError() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-red-600"> Error</CardTitle>
                    <CardDescription className="text-center">
                        There was a problem
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center">{error || "An unknown error occurred"}</p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button onClick={() => window.location.href = '/login'}>
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}