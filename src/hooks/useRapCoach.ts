import { useState, useCallback } from "react";

export const useRapCoach = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getRhymesAndTopics = useCallback(async (transcript: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/coach', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcript }),
            });

            if (!response.ok) {
                throw new Error("Pojawił się problem po stronie API");
            }

            const data = await response.json();
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Błąd analizy tekstu. Rap Coach niedostępny.");
            return { rhymes: [], nextTopic: "Błąd" };
        } finally {
            setLoading(false);
        }
    }, []);

    return { getRhymesAndTopics, loading, error };
};
