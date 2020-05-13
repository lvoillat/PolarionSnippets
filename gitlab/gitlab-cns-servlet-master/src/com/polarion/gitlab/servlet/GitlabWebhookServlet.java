/*
 * Copyright (C) 2004-2014 Polarion Software
 * All rights reserved.
 * Email: dev@polarion.com
 *
 *
 * Copyright (C) 2004-2014 Polarion Software
 * All Rights Reserved.  No use, copying or distribution of this
 * work may be made except in accordance with a valid license
 * agreement from Polarion Software.  This notice must be
 * included on all copies, modifications and derivatives of this
 * work.
 *
 * POLARION SOFTWARE MAKES NO REPRESENTATIONS OR WARRANTIES
 * ABOUT THE SUITABILITY OF THE SOFTWARE, EITHER EXPRESSED OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. POLARION SOFTWARE
 * SHALL NOT BE LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT
 * OF USING, MODIFYING OR DISTRIBUTING THIS SOFTWARE OR ITS DERIVATIVES.
 *
 */
package com.polarion.gitlab.servlet;

import java.io.IOException;
import java.security.PrivilegedAction;
import java.text.MessageFormat;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.security.auth.Subject;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.log4j.Logger;
import org.jetbrains.annotations.NotNull;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import com.polarion.alm.tracker.ITrackerService;
import com.polarion.alm.tracker.model.IComment;
import com.polarion.alm.tracker.model.IStatusOpt;
import com.polarion.alm.tracker.model.IWorkItem;
import com.polarion.alm.tracker.model.IWorkflowAction;
import com.polarion.core.util.types.Text;
import com.polarion.platform.ITransactionService;
import com.polarion.platform.core.PlatformContext;
import com.polarion.platform.security.AuthenticationFailedException;
import com.polarion.platform.security.ISecurityService;

/**
 * This servlet receive event from gitlab and handles merge request event the way that it tries to change status of related work item to merged
 */
@SuppressWarnings("nls")
public class GitlabWebhookServlet extends HttpServlet {

    @NotNull
    private static final Logger log = Logger.getLogger(GitlabWebhookServlet.class);
    private final Pattern pattern = Pattern.compile("Merge branch '\\w+_(\\w+-\\d+)_.*' into 'master'.*"); //$NON-NLS-1$

    private static final long serialVersionUID = 1L;
    private ITransactionService txService;

    /* (non-Javadoc)
     * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
     */
    @Override
    protected void doGet(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
        response.setStatus(200);
        response.flushBuffer();
    }

    /* (non-Javadoc)
     * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String projectId = getProjectId();
        String token = request.getHeader("X-Gitlab-Token");
        if (!getSecurityToken().equals(token)) {
            response.setStatus(401);
            response.flushBuffer();
            return;
        }
        ITrackerService trackerService = PlatformContext.getPlatform().lookupService(ITrackerService.class);
        ISecurityService securityService = PlatformContext.getPlatform().lookupService(ISecurityService.class);
        String eventType = request.getHeader("X-Gitlab-Event");
        String body = IOUtils.toString(request.getInputStream());
        log.info(MessageFormat.format("Gitlab webhook event:{0}", body));
        JSONParser parser = new JSONParser();
        JSONObject webhookEvent;
        try {
            webhookEvent = (JSONObject) parser.parse(body);
        } catch (ParseException ex) {
            throw new RuntimeException(ex);
        }
        try {
            if (eventType == null || projectId == null || projectId.isEmpty()) {
                response.setStatus(200);
                return;
            } else if ("Merge Request Hook".equals(eventType.trim())) {
                handleMergeRequestEvent(trackerService, securityService, webhookEvent);
            } else if ("Pipeline Hook".equals(eventType.trim())) {
                handlePipelineEvent(trackerService, securityService, webhookEvent);
            }
        } catch (AuthenticationFailedException e) {
            throw new RuntimeException(e);
        }
        response.setStatus(200);
    }

    private String getSecurityToken() {
        return System.getProperty("gitlab.webhook.token"); //$NON-NLS-1$
    }

    private String getUserKeyVaultId() {
        return System.getProperty("gitlab.webhook.userKey"); //$NON-NLS-1$
    }

    private String getProjectId() {
        return System.getProperty("gitlab.webhook.projectId"); //$NON-NLS-1$
    }

    private String getPipelineFailedStatus() {
        return System.getProperty("gitlab.webhook.pipelineFailedStatus"); //$NON-NLS-1$
    }

    private String getFinalStatus() {
        return System.getProperty("gitlab.webhook.finalStatus"); //$NON-NLS-1$
    }

    private String getPipelineFailedAction() {
        return System.getProperty("gitlab.webhook.pipelineFailedAction"); //$NON-NLS-1$
    }

    private String getPipelineRunningAction() {
        return System.getProperty("gitlab.webhook.pipelineRunningAction"); //$NON-NLS-1$
    }

    private String getPipelinePassedAction() {
        return System.getProperty("gitlab.webhook.pipelinePassedAction"); //$NON-NLS-1$
    }

    private String getPipelineIdField() {
        return System.getProperty("gitlab.webhook.pipelineIdField"); //$NON-NLS-1$
    }

    private void handlePipelineEvent(ITrackerService trackerService, ISecurityService securityService, JSONObject webhookEvent) throws AuthenticationFailedException {
        JSONObject pipeline = (JSONObject) webhookEvent.get("object_attributes");
        if (pipeline != null) {
            String status = (String) pipeline.get("status");
            String ref = (String) pipeline.get("ref");
            if (ref == null || status == null || !"master".equals(ref)) {
                return;
            }
            Integer pipelineId = Math.toIntExact(((Long) pipeline.get("id")));
            String pipelineUrl = ((String) ((JSONObject) webhookEvent.get("project")).get("web_url")) + "/pipelines/" + pipelineId;
            String commitMessage = (String) ((JSONObject) webhookEvent.get("commit")).get("message");
            Matcher matcher = pattern.matcher(commitMessage);
            if (matcher.find()) {
                String id = matcher.group(1);
                if (id != null && !id.isEmpty()) {
                    final IWorkItem workItem = trackerService.findWorkItem(getProjectId(), id);
                    Subject user = securityService.loginUserFromVault(getUserKeyVaultId(), "gitlab webhook");
                    securityService.doAsUser(user, (PrivilegedAction<Void>) () -> {
                        executeInTx(() -> {
                            Integer savedPipelineId = (Integer) workItem.getCustomField(getPipelineIdField());
                            if (savedPipelineId != null && pipelineId < savedPipelineId) {
                                return;
                            }

                            if ("failed".equals(status)) {
                                pipelineFailed(workItem, pipelineId, pipelineUrl);
                            } else if ("success".equals(status)) {
                                markAsSuccess(workItem, pipelineId, pipelineUrl, trackerService);
                            } else if ("running".equals(status)) {
                                markAsRunning(workItem, pipelineId, pipelineUrl);
                            }
                        });
                        return null;
                    });
                }
            }
        }
    }

    private void handleMergeRequestEvent(ITrackerService trackerService, ISecurityService securityService, JSONObject webhookEvent) throws AuthenticationFailedException {
        JSONObject mergeRequest = (JSONObject) webhookEvent.get("object_attributes");
        if (mergeRequest != null) {
            String state = (String) mergeRequest.get("action");
            String sourceBranch = (String) mergeRequest.get("source_branch");
            String url = (String) mergeRequest.get("url");
            Long mergeRequestId = (Long) mergeRequest.get("iid");
            String userName = getUser(webhookEvent);
            if (sourceBranch != null && !sourceBranch.isEmpty() && ("merge".equals(state) || "approved".equals(state))) {
                String[] branchNameParts = sourceBranch.split("_");
                if (branchNameParts.length > 1) {
                    String id = branchNameParts[1];
                    final IWorkItem workItem = trackerService.findWorkItem(getProjectId(), id);
                    Subject user = securityService.loginUserFromVault(getUserKeyVaultId(), "gitlab webhook");
                    securityService.doAsUser(user, (PrivilegedAction<Void>) () -> {
                        executeInTx(() -> {
                            if ("merge".equals(state)) {
                                merge(workItem, userName, mergeRequestId, url);
                            } else if ("approved".equals(state)) {
                                approve(workItem, userName, mergeRequestId, url);
                            }
                        });
                        return null;
                    });

                }
            }
        }
    }

    private String getUser(JSONObject jsonObject) {
        JSONObject user = (JSONObject) jsonObject.get("user");
        if (user != null) {
            String userName = (String) user.get("name");
            if (userName != null && !userName.isEmpty()) {
                return userName;
            }
        }
        return "unknown";
    }

    private void merge(final IWorkItem workItem, String userName, Long mergeRequestId, String url) {
        String message = MessageFormat.format("Merge Request <a target=\"_blank\" href=\"{0}\">!{1}</a> was merged by {2}", url, mergeRequestId, userName);
        addComment(workItem, message, "Merged");
    }

    private void approve(final IWorkItem workItem, String userName, Long mergeRequestId, String url) {
        String message = MessageFormat.format("Merge Request <a target=\"_blank\" href=\"{0}\">!{1}</a> was approved by {2}", url, mergeRequestId, userName);
        addComment(workItem, message, "Approved");
    }

    private void pipelineFailed(IWorkItem workItem, Integer pipelineId, String pipelineUrl) {
        String targetAction = getPipelineFailedAction();
        if (targetAction == null || targetAction.isEmpty()) {
            throw new IllegalArgumentException("Property gitlab.webhook.reopenStatus is not set");
        }
        String message = MessageFormat.format("Pipeline <a target=\"_blank\" href=\"{0}\">{1}</a> failed", pipelineUrl, pipelineId);
        if (changeWorkItemStatus(workItem, targetAction)) {
            addComment(workItem, message, "Reopen due to failed pipeline on master");
            workItem.save();
        }
    }

    private void markAsSuccess(IWorkItem workItem, Integer pipelineId, String pipelineUrl, ITrackerService trackerService) {
        String targetAction = getPipelinePassedAction();
        if (targetAction == null || targetAction.isEmpty()) {
            throw new IllegalArgumentException("Property gitlab.webhook.targetStatus is not set");
        }
        String message = MessageFormat.format("Pipeline <a target=\"_blank\" href=\"{0}\">{1}</a> succeeded", pipelineUrl, pipelineId);
        if (changeWorkItemStatus(workItem, targetAction)) {
            addComment(workItem, message, "Done");
            workItem.save();
        }

        message = MessageFormat.format("Closed because later pipeline <a target=\"_blank\" href=\"{0}\">{1}</a> succeeded", pipelineUrl, pipelineId);
        String pipelineIdField = getPipelineIdField();
        String query = createQueryForPipelineFailedItems(pipelineId, pipelineIdField);
        for (IWorkItem wi : ((List<IWorkItem>) trackerService.queryWorkItems(query, "ID"))) {
            if (changeWorkItemStatus(wi, targetAction)) {
                addComment(wi, message, "Done");
                wi.setCustomField(pipelineIdField, pipelineId);
                wi.save();
            }
        }
    }

    private String createQueryForPipelineFailedItems(Integer pipelineId, String pipelineIdField) {
        StringBuilder queryBuilder = new StringBuilder();
        queryBuilder.append("status:");
        queryBuilder.append(getPipelineFailedStatus().replaceAll("-", "\\-"));
        queryBuilder.append(" AND ");
        queryBuilder.append(pipelineIdField);
        queryBuilder.append(".1:[00000000000 TO ");
        queryBuilder.append(String.format("%011d", pipelineId));
        queryBuilder.append("]");
        return queryBuilder.toString();
    }

    private void markAsRunning(IWorkItem workItem, Integer pipelineId, String pipelineUrl) {
        String targetAction = getPipelineRunningAction();
        if (targetAction == null || targetAction.isEmpty()) {
            throw new IllegalArgumentException("Property gitlab.webhook.pipelineRunningStatus is not set");
        }
        String message = MessageFormat.format("Pipeline <a target=\"_blank\" href=\"{0}\">{1}</a> started", pipelineUrl, pipelineId);
        Integer savedPipelineId = (Integer) workItem.getCustomField(getPipelineIdField());
        IStatusOpt status = workItem.getStatus();
        if (status != null && !status.getId().equals(getFinalStatus()) && changeWorkItemStatus(workItem, targetAction) || (savedPipelineId != null && savedPipelineId < pipelineId)) {
            addComment(workItem, message, "Running");
            workItem.setCustomField(getPipelineIdField(), pipelineId);
            log.info(MessageFormat.format("Gitlab webhook event: pipeline {0} started", pipelineId));
            workItem.save();
        }
    }

    private boolean changeWorkItemStatus(IWorkItem workItem, String targetAction) {
        final IWorkflowAction[] actions = workItem.getAvailableActions();
        for (IWorkflowAction action : actions) {
            if (targetAction.equals(action.getNativeActionId())) {
                workItem.performAction(action.getActionId());
                log.info(MessageFormat.format("Gitlab webhook event: performing action ''{0}'' on {1}", action.getActionName(), workItem.getId()));
                return true;
            }
        }
        return false;
    }

    private void addComment(IWorkItem workItem, String message, String title) {
        log.info(MessageFormat.format("Gitlab webhook event: {0}", message));
        IComment comment = workItem.createComment(Text.html(message), title, null);
        comment.save();
    }

    private void executeInTx(Runnable runnable) {
        getTransactionService().execute().write().runnable(runnable);

    }

    private ITransactionService getTransactionService() {
        if (txService == null) {
            txService = PlatformContext.getPlatform().lookupService(ITransactionService.class);
        }
        return txService;
    }

}
