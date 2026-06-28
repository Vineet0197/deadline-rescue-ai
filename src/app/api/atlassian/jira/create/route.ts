import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/db/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      cloudId: string;
      projectKey: string;
      task: {
        title: string;
        dueDate: string;
        estimatedEffortHours: number;
        priority: string;
      };
      plan?: {
        risk: string;
        riskReason: string;
        focusBlocks: Array<{ title: string; start: string; end: string; durationHours: number }>;
      };
      advice?: any;
    };

    // Get Atlassian tokens
    const db = adminDb;
    

    const integrationDoc = await db
      .collection("users")
      .doc(user.id)
      .collection("integrations")
      .doc("atlassian")
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json(
        { error: "Atlassian not connected" },
        { status: 400 }
      );
    }

    const { accessToken } = integrationDoc.data() as { accessToken: string };

    // Map priority
    const priorityMap: Record<string, string> = {
      highest: "Highest",
      high: "High",
      medium: "Medium",
      low: "Low",
    };

    // Build description
    let description = `*Created by Deadline Rescue AI*\n\n`;
    description += `h3. Task Details\n`;
    description += `* Estimated Effort: ${body.task.estimatedEffortHours} hours\n`;
    description += `* Deadline: ${new Date(body.task.dueDate).toLocaleString()}\n\n`;

    if (body.plan) {
      description += `h3. Rescue Plan Analysis\n`;
      description += `* Risk Level: ${body.plan.risk.toUpperCase()}\n`;
      description += `* Reason: ${body.plan.riskReason}\n\n`;

      if (body.plan.focusBlocks.length > 0) {
        description += `h3. Recommended Focus Blocks\n`;
        body.plan.focusBlocks.forEach((block, i) => {
          description += `${i + 1}. *${block.title}*\n`;
          description += `   - ${new Date(block.start).toLocaleString()} - ${new Date(block.end).toLocaleString()}\n`;
          description += `   - Duration: ${block.durationHours.toFixed(1)}h\n`;
        });
      }
    }

    if (body.advice?.taskBreakdown?.subtasks) {
      description += `\nh3. Task Breakdown\n`;
      body.advice.taskBreakdown.subtasks.forEach((subtask: any) => {
        description += `# ${subtask.title} (${subtask.estimatedHours}h)\n`;
      });
    }

    // Create JIRA issue
    const jiraResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${body.cloudId}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fields: {
            project: {
              key: body.projectKey,
            },
            summary: body.task.title,
            description: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: description,
                    },
                  ],
                },
              ],
            },
            issuetype: {
              name: "Task",
            },
            priority: {
              name: priorityMap[body.task.priority] || "Medium",
            },
            duedate: body.task.dueDate.split("T")[0], // YYYY-MM-DD format
          },
        }),
      }
    );

    if (!jiraResponse.ok) {
      const error = await jiraResponse.text();
      console.error("JIRA creation failed:", error);
      return NextResponse.json(
        { error: "Failed to create JIRA issue", details: error },
        { status: 500 }
      );
    }

    const jiraIssue = await jiraResponse.json() as { key: string; id: string; self: string };

    return NextResponse.json({
      success: true,
      issueKey: jiraIssue.key,
      issueId: jiraIssue.id,
      issueUrl: `https://${body.cloudId}.atlassian.net/browse/${jiraIssue.key}`,
    });
  } catch (error) {
    console.error("JIRA creation error:", error);
    return NextResponse.json(
      { error: "Failed to create JIRA issue" },
      { status: 500 }
    );
  }
}
