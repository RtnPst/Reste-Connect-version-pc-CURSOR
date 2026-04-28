import { supabase } from "@/integrations/supabase/client";

type CheckAnswerResult = {
  correct: boolean;
  correct_index: number;
  explanation: string;
};

export async function checkAnswer(questionId: string, chosen: number): Promise<CheckAnswerResult> {
  const { data, error } = await supabase.rpc("check_answer", {
    _question_id: questionId,
    _chosen: chosen,
  });

  if (error || !data?.[0]) {
    throw new Error("Impossible de verifier la reponse");
  }

  return data[0] as CheckAnswerResult;
}
